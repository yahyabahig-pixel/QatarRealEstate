using MediatR;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using RealEstate.Application.policies;
using RealEstate.Application.Properties.Admin.Policies;
using BuildingBlocks.Application.Behaviors;

namespace RealEstate.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly, includeInternalTypes: true);

        // Validation runs for every request in the pipeline.
        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

        services.AddScoped<PropertyAuthorizationPolicy>();
        services.AddScoped<PropertyOwnershipPolicy>();

        return services;
    }
}