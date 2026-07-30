using Microsoft.Extensions.DependencyInjection;

namespace Auth.Api;

public static class DependencyInjection
{
    public static IServiceCollection AddAuthApi(this IServiceCollection services)
    {
        // JSON options (string enums) are configured once by AddRealEstateApi's AddControllers
        // call — MVC options are global. We only need to add OUR assembly as an application part.
        services.AddControllers()
            .AddApplicationPart(typeof(DependencyInjection).Assembly);

        return services;
    }
}
