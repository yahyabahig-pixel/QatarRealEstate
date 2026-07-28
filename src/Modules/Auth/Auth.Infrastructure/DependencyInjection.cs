using System.Text;
using Auth.Application.Abstractions.Authentication;
using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Persistence;
using Auth.Infrastructure.Data;
using Auth.Infrastructure.Data.Interceptors;
using Auth.Infrastructure.Data.Queries;
using Auth.Infrastructure.Data.Repositories;
using Auth.Infrastructure.Data.UnitOfWork;
using Auth.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;

namespace Auth.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddAuthInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddSingleton(TimeProvider.System);

        services.AddScoped<AuthAuditInterceptor>();

        // ---- DbContext: module schema "auth", own migration history --------------------
        services.AddDbContext<AuthDbContext>((sp, options) =>
        {
            options.UseSqlServer(
                configuration.GetConnectionString("RealEstateDb"),
                sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "auth"));
            options.AddInterceptors(sp.GetRequiredService<AuthAuditInterceptor>());
        });

        // ---- ASP.NET Core Identity (stores + managers; NO cookie UI) -------------------
        services.AddIdentityCore<AppUser>(options =>
            {
                options.User.RequireUniqueEmail = true;

                options.Password.RequiredLength = 8;
                options.Password.RequireDigit = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireNonAlphanumeric = false;

                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
                options.Lockout.AllowedForNewUsers = true;
            })
            .AddRoles<AppRole>()
            .AddEntityFrameworkStores<AuthDbContext>()
            .AddSignInManager();

        // ---- JWT bearer authentication --------------------------------------------------
        var jwtSection = configuration.GetSection(JwtSettings.SectionName);
        services.Configure<JwtSettings>(jwtSection);
        var jwt = jwtSection.Get<JwtSettings>()
                  ?? throw new InvalidOperationException("Missing 'Jwt' configuration section.");

        // Fail FAST and CLEARLY on a missing/weak secret. Without this, an empty secret
        // only explodes later as a cryptic IDX10703 key-length error on the first login.
        // (Safe for `dotnet ef`: the design-time AuthDbContextFactory takes precedence
        // over building the host, so migrations never hit this code path.)
        if (string.IsNullOrWhiteSpace(jwt.Secret) || jwt.Secret.Length < 32)
            throw new InvalidOperationException(
                "Jwt:Secret must be configured and at least 32 characters long. " +
                "Set it via appsettings.Development.json (dev) or user-secrets/environment variables (prod).");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1),
                    NameClaimType = ClaimTypes.NameIdentifier,
                    RoleClaimType = ClaimTypes.Role,
                };
            });

        // ---- module services -------------------------------------------------------------
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddScoped<IAuthTokenService, JwtTokenService>();
        services.AddScoped<ICurrentAdmin, CurrentAdmin>();
        services.AddScoped<IPositionRepository, PositionRepository>();
        services.AddScoped<IAuthUnitOfWork, AuthUnitOfWork>();
        services.AddScoped<IAdminQueries, AdminQueries>();
        services.AddScoped<IPositionQueries, PositionQueries>();

        return services;
    }
}
