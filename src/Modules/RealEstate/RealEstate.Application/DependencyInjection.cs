using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using RealEstate.Application.policies;
using RealEstate.Application.Properties.Admin.Policies;

namespace RealEstate.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));
        services.AddValidatorsFromAssembly(assembly, includeInternalTypes: true);

        // NOTE: ValidationBehavior is NOT registered here. It is an open generic that MediatR
        // resolves from the whole container, so a per-module registration made it run once per
        // module — twice for every request. The Host registers it once, for both modules.

        services.AddScoped<PropertyAuthorizationPolicy>();
        services.AddScoped<PropertyOwnershipPolicy>();

        return services;
    }
}
