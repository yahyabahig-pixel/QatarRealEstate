using System.Text;
using Auth.Application.Abstractions.Authentication;
using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Persistence;
using Auth.Infrastructure.Data;
using Auth.Infrastructure.Data.Queries;
using Auth.Infrastructure.Data.Repositories;
using Auth.Infrastructure.Data.UnitOfWork;
using Auth.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
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

        // ---- DbContext: module schema "auth", own migration history --------------------
        services.AddDbContext<AuthDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("RealEstateDb"),
                sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "auth")));

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
