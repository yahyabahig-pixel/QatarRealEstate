using RealEstate.Application.Catalog;
using RealEstate.Application.Features;

namespace RealEstate.Application.Abstractions.Persistence;

// Read side for the two reference catalogs (property types, features). The public lists
// are anonymous data — both already appear inside every public property details response.
// The admin list additionally exposes inactive features and requires Feature.Read.
public interface ICatalogQueries
{
    Task<IReadOnlyList<PropertyTypeDto>> ListPropertyTypesAsync(CancellationToken ct = default);
    Task<IReadOnlyList<FeatureCatalogItemDto>> ListFeaturesAsync(CancellationToken ct = default);
    Task<IReadOnlyList<FeatureAdminDto>> ListFeaturesForAdminAsync(CancellationToken ct = default);
}
