using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;

namespace RealEstate.Api;

public static class DependencyInjection
{
    public static IServiceCollection AddRealEstateApi(this IServiceCollection services)
    {
        services.AddControllers()
            .AddApplicationPart(typeof(DependencyInjection).Assembly)   // ← find OUR controllers
            .AddJsonOptions(json =>
            {
                // Enums as strings in BOTH directions:
                //   "listingKind": "Sale"   instead of   "listingKind": 0
                // Applies to ListingKind, PropertyStatus, PaymentMethod, Frequency,
                // PublicationAction, PropertySortBy — everywhere, automatically.
                json.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
            });

        return services;
    }
}