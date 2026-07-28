using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using RealEstate.Application.Abstractions.Authentication;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Infrastructure.Data.Authentication;
using RealEstate.Infrastructure.Data.Interceptors;
using RealEstate.Infrastructure.Data.Queries;
using RealEstate.Infrastructure.Data.Repositories;
using RealEstate.Infrastructure.Data.UnitOfWork;
using RealEstate.Infrastructure.Data.ViewRecording;

namespace RealEstate.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddRealEstateInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        // --- auditing prerequisites -------------------------------------------------
        services.AddHttpContextAccessor();
        services.AddSingleton(TimeProvider.System);            // testable clock, .NET 8 built-in
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<AuditableEntityInterceptor>();

        // --- DbContext (SQL Server) with the audit interceptor wired in -------------
        services.AddDbContext<RealEstateDbContext>((sp, options) =>
        {
            options.UseSqlServer(
                configuration.GetConnectionString("RealEstateDb"),
                sql => sql.MigrationsHistoryTable("__EFMigrationsHistory", "realestate"));
            options.AddInterceptors(sp.GetRequiredService<AuditableEntityInterceptor>());
        });

        // --- write side ---------------------------------------------------------------
        services.AddScoped<IPropertyRepository, PropertyRepository>();
        services.AddScoped<IFeatureRepository, FeatureRepository>();
        services.AddScoped<IAgentRepository, AgentRepository>();
        services.AddScoped<IStoredImageRepository, StoredImageRepository>();
        services.AddScoped<IDevelopmentRepository, DevelopmentRepository>();
        services.AddScoped<IAreaRepository, AreaRepository>();
        services.AddScoped<IJobRepository, JobRepository>();
        services.AddScoped<IUnitOfWork, EfUnitOfWork>();

        // --- read side ------------------------------------------------------------------
        services.AddScoped<IPropertyQueries, PropertyQueries>();
        services.AddScoped<IAgentQueries, AgentQueries>();
        services.AddScoped<IStoredImageQueries, StoredImageQueries>();
        services.AddScoped<IDevelopmentQueries, DevelopmentQueries>();
        services.AddScoped<IAreaQueries, AreaQueries>();
        services.AddScoped<IJobQueries, JobQueries>();
        services.AddScoped<ICatalogQueries, CatalogQueries>();
        services.AddScoped<IPropertyViewRecorder, PropertyViewRecorder>();

        return services;
    }
}