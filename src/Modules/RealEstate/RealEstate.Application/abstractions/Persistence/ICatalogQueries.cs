using RealEstate.Application.Catalog;

namespace RealEstate.Application.Abstractions.Persistence;

// Read side for the two reference catalogs (property types, features). Anonymous data —
// both already appear inside every public property details response, so listing them
// leaks nothing new.
public interface ICatalogQueries
{
    Task<IReadOnlyList<PropertyTypeDto>> ListPropertyTypesAsync(CancellationToken ct = default);
    Task<IReadOnlyList<FeatureCatalogItemDto>> ListFeaturesAsync(CancellationToken ct = default);
}
