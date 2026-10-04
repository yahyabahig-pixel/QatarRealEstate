using System.Threading.RateLimiting;
using Auth.Api;
using Auth.Application;
using Auth.Infrastructure;
using BuildingBlocks.Application.Behaviors;
using BuildingBlocks.Authorization;
using Host.ErrorHandling;
using Host.Middleware;
using Host.OpenApi;
using Host.Startup;
using MediatR;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using RealEstate.Api;
using RealEstate.Application;
using RealEstate.Infrastructure;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

// ---- structured logging (Serilog) ----------------------------------------------------
builder.Host.UseSerilog((context, configuration) => configuration
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId} {Message:lj}{NewLine}{Exception}"));

// ---- the RealEstate module, layer by layer -------------------------------------------
builder.Services.AddApplication();                                   // MediatR + validators + policies
builder.Services.AddRealEstateInfrastructure(builder.Configuration); // DbContext + repos + queries
builder.Services.AddRealEstateApi();                                 // controllers + JSON options

// ---- the Auth module, layer by layer --------------------------------------------------
builder.Services.AddAuthApplication();                               // MediatR + validators
builder.Services.AddAuthInfrastructure(builder.Configuration);       // Identity + JWT + AuthDbContext
builder.Services.AddAuthApi();                                       // controllers

// ---- request validation, registered ONCE ----------------------------------------------
// Both modules used to register an open-generic ValidationBehavior of their own. MediatR
// resolves open generics from the whole container, so every request ran through validation
// twice — every validator executed twice, every query behind it twice. One registration here
// covers both modules, which is what a shared pipeline behaviour is for.
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

// ---- data protection ------------------------------------------------------------------
// Identity protects its password-reset and email-confirmation tokens - and the antiforgery
// cookie - with a key ring. Left to itself the framework writes that ring under the
// container user's home directory, which is part of the container's writable layer and is
// therefore thrown away on every rebuild: outstanding tokens stop validating, and each
// restart logs "No XML encryptor configured".
//
// DataProtection:KeyRingPath points at a directory backed by a named volume (see
// docker-compose.yml). It is deliberately left unset outside containers, so `dotnet run` on
// a dev machine keeps the framework default and local behaviour is unchanged.
//
// SetApplicationName is not optional here: without it the ring is isolated by content-root
// path, so the same keys silently stop matching if the app is ever published elsewhere.
var dataProtection = builder.Services
    .AddDataProtection()
    .SetApplicationName("QatarRealEstate");

var keyRingPath = builder.Configuration["DataProtection:KeyRingPath"];
if (!string.IsNullOrWhiteSpace(keyRingPath))
{
    // CreateDirectory is idempotent, and doing it here means a bad mount or a permission
    // mistake fails loudly at startup rather than on the first password-reset request.
    dataProtection.PersistKeysToFileSystem(Directory.CreateDirectory(keyRingPath));
}

// ---- authorization: permission policies for ALL modules -------------------------------
builder.Services.AddPermissionAuthorization();

// ---- rate limiting --------------------------------------------------------------------
// Three endpoints are reachable without a token and each one is abusable:
//   login   — 5 wrong passwords lock an account for 5 minutes, so anyone who knows the main
//             admin's email could keep that account locked out indefinitely, for free.
//   leads   — the public contact forms write a row per request.
//   views   — the view counter is a bare UPDATE, so any listing's popularity is forgeable.
// Partitioned by client IP, which is only correct behind nginx because UseForwardedHeaders
// runs first (below) — without it every visitor shares the proxy's address and one abuser
// would rate-limit the whole site.
const string LoginRateLimit = "login";
const string PublicWriteRateLimit = "public-write";

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy(LoginRateLimit, context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ClientKey(context),
        factory: _ => new FixedWindowRateLimiterOptions
        {
            // Comfortably above a person mistyping their password, far below a script.
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(5),
            QueueLimit = 0,
        }));

    options.AddPolicy(PublicWriteRateLimit, context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ClientKey(context),
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(5),
            QueueLimit = 0,
        }));

    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.Headers.RetryAfter = "300";
        context.HttpContext.RequestServices
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger("RateLimiting")
            .LogWarning("Rate limit hit on {Path} from {Client}.",
                context.HttpContext.Request.Path, ClientKey(context.HttpContext));

        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            title = "Too many requests",
            status = StatusCodes.Status429TooManyRequests,
            detail = "Too many requests from this address. Please try again in a few minutes.",
        }, token);
    };

    static string ClientKey(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
});

// ---- CORS: let the React dev server (a different origin) call this API ----------------
// Browsers block cross-origin fetches unless the server opts in. Origins come from
// "Cors:AllowedOrigins" in appsettings; the fallback covers Vite's default dev ports.
// AllowAnyHeader is needed for Authorization + Content-Type on the JWT'd admin calls.
const string FrontendCorsPolicy = "Frontend";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

builder.Services.AddCors(options =>
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()));

// ---- forwarded headers ----------------------------------------------------------------
// nginx (and Caddy in front of it) terminate the connection, so without this every request
// looks like it came from the proxy container: rate limiting would bucket the whole internet
// together and the logs would record one address forever. KnownNetworks/KnownProxies are
// cleared because the proxy's address inside a Docker network is not known in advance; the
// container ports are not published, so only the proxy can reach Kestrel anyway.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ---- the safety net -------------------------------------------------------------------
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<VersionInfoTransformer>();
});

var app = builder.Build();

// ---- one-shot maintenance command -----------------------------------------------------
// `dotnet Host.dll seed --demo` (and friends) run here and exit without starting the web
// server. See SeedCommand for why demo content is a command and not a startup flag.
if (SeedCommand.IsRequested(args))
{
    return await SeedCommand.RunAsync(app, args);
}

// `dotnet Host.dll reset-admin-password` — the way back into the Main Admin account when the
// password in .env no longer matches the one stored at first deploy. See AdminAccountCommand.
if (AdminAccountCommand.IsRequested(args))
{
    return await AdminAccountCommand.RunAsync(app, args);
}

app.UseForwardedHeaders();                         // BEFORE anything that reads the client address
app.UseMiddleware<RequestLogContextMiddleware>();  // stamps everything after it
app.UseExceptionHandler();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// ---- database bootstrap --------------------------------------------------------------
// Driven by configuration instead of by environment, so the SAME published image can be
// told to migrate in production.
var applyMigrations = app.Configuration.GetValue("Startup:ApplyMigrations", app.Environment.IsDevelopment());

if (applyMigrations)
{
    await app.MigrateDatabaseAsync();
}

// Identity + reference data only. Demo content is never seeded automatically — it is the
// `seed --demo` command, so a restart can never resurrect listings an admin deleted.
//
// Gated on the migrations having been applied BY THIS PROCESS. The bootstrap's very first
// read is the SeedHistory table, which only exists after the 20260930090000_* migrations —
// so on a deployment that applies migrations out of band (Startup:ApplyMigrations=false),
// running it here throws "Invalid object name 'auth.SeedHistory'" and the container exits
// before it ever listens. Such a deployment seeds explicitly instead, with the same command
// that applies its migrations:
//
//     docker compose run --rm backend seed --identity --reference
if (applyMigrations)
{
    await SeedCommand.RunStartupBootstrapAsync(app);
}
else
{
    app.Logger.LogInformation(
        "Startup:ApplyMigrations is false, so the seed bootstrap was skipped as well — it reads " +
        "tables that the migrations create. Run `seed --identity --reference` after migrating.");
}

// ---- https redirection ---------------------------------------------------------------
// Behind the nginx container the site is served as plain HTTP on a bare IP. Redirecting to
// https there would break every API call and fill the log with warnings about an undefined
// https port. Turn this back on with Startup__UseHttpsRedirection=true the day a domain and
// a certificate exist.
if (app.Configuration.GetValue("Startup:UseHttpsRedirection", !app.Environment.IsProduction()))
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);   // before auth: even 401s need the CORS headers

app.UseRateLimiter();

app.UseAuthentication();   // who are you?  (validates the JWT, fills HttpContext.User)
app.UseAuthorization();    // may you?      (permission policies + [Authorize])

app.MapControllers();

app.Run();
return 0;
