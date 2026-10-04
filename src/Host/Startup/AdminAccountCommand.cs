using Auth.Infrastructure.Data;
using Auth.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Host.Startup;

// ---------------------------------------------------------------------------------------------
//  Getting back into the Main Admin account.
//
//  The bootstrap in AuthSeeder creates the Main Admin from MainAdmin:Email and
//  MainAdmin:Password, and only `if (!mainAdminExists)`. That is correct — a seeder that
//  overwrote the password on every start would hand the whole site to anyone who could edit
//  .env, and would silently undo a password the owner had changed from inside the app.
//
//  But it left no way back in. Edit MAIN_ADMIN_PASSWORD in .env after the first deploy and
//  nothing happens: the stored hash is still the original one, the sign-in is refused, and the
//  only remaining options are editing the database by hand or deleting the account that owns
//  every audit trail in the system. That is this command.
//
//      docker compose run --rm backend reset-admin-password
//      docker compose run --rm backend reset-admin-password --sync-email
//
//  The second form also moves the account onto MainAdmin:Email. The sign-in address has the
//  same one-way problem as the password: it is fixed at first deploy and UpdateAdminCommand
//  carries only a FullName, so months later the owner is still signing in as whatever
//  placeholder was in .env on day one. It is opt-in because changing the address somebody
//  signs in with should be something they asked for, not a side effect.
//
//  It reads the NEW password from the same configuration the bootstrap uses, so the secret
//  stays in .env and never reaches a shell history, a terminal, or a log line. It is a
//  deliberate, one-shot maintenance command: nothing about it runs at startup.
//
//  It also clears any lockout, because an owner who has just proved they control the server's
//  configuration should not then be told to wait fifteen minutes.
// ---------------------------------------------------------------------------------------------
public static class AdminAccountCommand
{
    public const string Verb = "reset-admin-password";

    /// <summary>True when the process was started as `dotnet Host.dll reset-admin-password`.</summary>
    public static bool IsRequested(string[] args) =>
        args.Length > 0 && string.Equals(args[0], Verb, StringComparison.OrdinalIgnoreCase);

    public static async Task<int> RunAsync(WebApplication app, string[] args, CancellationToken ct = default)
    {
        var logger = app.Services.GetRequiredService<ILoggerFactory>().CreateLogger("Startup.AdminAccount");

        // --email lets an owner point at a specific account; without it the Main Admin is the
        // one and only target, which is the case this exists for.
        var requestedEmail = ValueOf(args, "--email");

        // --sync-email also moves the account onto MainAdmin:Email. The sign-in email is set
        // once at first deploy and there is no way to change it afterwards: UpdateAdminCommand
        // carries only a FullName, so the owner is stuck signing in as whatever address was in
        // .env on day one — usually a placeholder nobody recognises months later. Opt-in, not
        // automatic: changing the address somebody signs in with should be something they asked
        // for, not a side effect of resetting a password.
        var syncEmail = HasFlag(args, "--sync-email");

        await using var scope = app.Services.CreateAsyncScope();
        var sp = scope.ServiceProvider;
        var users = sp.GetRequiredService<UserManager<AppUser>>();
        var configuration = sp.GetRequiredService<IConfiguration>();

        var newPassword = configuration["MainAdmin:Password"];
        if (string.IsNullOrWhiteSpace(newPassword))
        {
            logger.LogError(
                "MainAdmin:Password is not configured, so there is no password to set. Put the new " +
                "password in .env as MAIN_ADMIN_PASSWORD and run this again. It is read from there " +
                "on purpose: a password typed on the command line ends up in your shell history.");
            return 2;
        }

        AppUser? user;
        if (!string.IsNullOrWhiteSpace(requestedEmail))
        {
            user = await users.FindByEmailAsync(requestedEmail);
            if (user is null)
            {
                logger.LogError("No account exists with the email {Email}.", requestedEmail);
                await ListAccountsAsync(sp, logger, ct);
                return 3;
            }
        }
        else
        {
            user = await users.Users.FirstOrDefaultAsync(u => u.IsMainAdmin, ct);
            if (user is null)
            {
                logger.LogError(
                    "There is no Main Admin in this database. Start the application normally and the " +
                    "bootstrap will create one from MainAdmin:Email and MainAdmin:Password.");
                return 3;
            }
        }

        // RemovePassword + AddPassword rather than a reset token: Identity is registered with
        // AddIdentityCore and no default token providers, so GeneratePasswordResetTokenAsync
        // would throw. The token flow exists to prove an email address anyway, which the person
        // holding the server's .env has no need to prove.
        //
        // VALIDATE BEFORE REMOVING. Those are two separate writes, so a new password rejected
        // after the old one is already gone would leave an account with no password at all —
        // locked out worse than before, by the command meant to fix being locked out. Running
        // the same validators Identity would run leaves only a crash between the two lines.
        foreach (var validator in users.PasswordValidators)
        {
            var check = await validator.ValidateAsync(users, user, newPassword);
            if (!check.Succeeded)
            {
                logger.LogError(
                    "The password in MAIN_ADMIN_PASSWORD does not meet this application's rules " +
                    "({Errors}). Nothing was changed — the existing password still works. Fix it " +
                    "in .env and run this again.",
                    Describe(check));
                return 4;
            }
        }

        var removed = await users.RemovePasswordAsync(user);
        if (!removed.Succeeded)
        {
            logger.LogError("Could not clear the existing password: {Errors}", Describe(removed));
            return 4;
        }

        var added = await users.AddPasswordAsync(user, newPassword);
        if (!added.Succeeded)
        {
            // The old password is already gone at this point, so say so plainly rather than
            // leaving the owner to discover an account with no password at all.
            logger.LogError(
                "The new password was REJECTED ({Errors}). The account now has NO password — fix " +
                "MAIN_ADMIN_PASSWORD in .env and run this command again before trying to sign in.",
                Describe(added));
            return 4;
        }

        if (syncEmail)
        {
            var wanted = configuration["MainAdmin:Email"];
            if (string.IsNullOrWhiteSpace(wanted))
            {
                logger.LogWarning(
                    "--sync-email was passed but MainAdmin:Email is not configured, so the email " +
                    "was left as {Email}. The password WAS reset.", user.Email);
            }
            else if (!string.Equals(wanted, user.Email, StringComparison.OrdinalIgnoreCase))
            {
                // Taken by someone else, this would collide on the unique index and fail in a
                // way that reads like a bug. Say it plainly instead.
                var clash = await users.FindByEmailAsync(wanted);
                if (clash is not null && clash.Id != user.Id)
                {
                    logger.LogError(
                        "The password was reset, but the email was NOT changed: {Email} already " +
                        "belongs to another account.", wanted);
                    return 5;
                }

                var previous = user.Email;
                var mailed = await users.SetEmailAsync(user, wanted);
                // UserName is what Identity authenticates against, so it has to move too —
                // changing only the email leaves the old address as the real sign-in name.
                var named = mailed.Succeeded ? await users.SetUserNameAsync(user, wanted) : mailed;

                if (!named.Succeeded)
                {
                    logger.LogError(
                        "The password was reset, but changing the email failed: {Errors}",
                        Describe(named));
                    return 5;
                }

                user.EmailConfirmed = true;
                await users.UpdateAsync(user);
                logger.LogInformation("Sign-in email moved from {Previous} to {Email}.", previous, wanted);
            }
        }

        // A lockout from the failed attempts that led here would otherwise outlive the fix.
        await users.SetLockoutEndDateAsync(user, null);
        await users.ResetAccessFailedCountAsync(user);

        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            await users.UpdateAsync(user);
        }

        // The email, never the password. This line ends up in container logs.
        logger.LogInformation(
            "The password for {Email} has been reset from MainAdmin:Password, and any lockout cleared. " +
            "Sign in with that email and the value currently in MAIN_ADMIN_PASSWORD.",
            user.Email);

        return 0;
    }

    private static async Task ListAccountsAsync(IServiceProvider sp, ILogger logger, CancellationToken ct)
    {
        var db = sp.GetRequiredService<AuthDbContext>();
        var emails = await db.Users
            .OrderByDescending(u => u.IsMainAdmin).ThenBy(u => u.Email)
            .Select(u => new { u.Email, u.IsMainAdmin })
            .ToListAsync(ct);

        if (emails.Count == 0)
        {
            logger.LogInformation("This database has no accounts at all.");
            return;
        }

        logger.LogInformation(
            "The accounts that do exist: {Accounts}",
            string.Join(", ", emails.Select(e => e.IsMainAdmin ? $"{e.Email} (Main Admin)" : e.Email)));
    }

    private static string Describe(IdentityResult result) =>
        string.Join("; ", result.Errors.Select(e => e.Description));

    private static bool HasFlag(string[] args, string flag) =>
        args.Any(a => string.Equals(a, flag, StringComparison.OrdinalIgnoreCase));

    /// <summary>Reads `--flag value`, returning null when the flag is absent or has no value.</summary>
    private static string? ValueOf(string[] args, string flag)
    {
        for (var i = 0; i < args.Length - 1; i++)
        {
            if (string.Equals(args[i], flag, StringComparison.OrdinalIgnoreCase))
                return args[i + 1];
        }

        return null;
    }
}
