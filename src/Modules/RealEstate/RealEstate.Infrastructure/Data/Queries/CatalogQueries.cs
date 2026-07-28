using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Catalog;

namespace RealEstate.Infrastructure.Data.Queries;

public sealed class CatalogQueries : ICatalogQueries
{
    private readonly RealEstateDbContext _db;
    public CatalogQueries(RealEstateDbContext db) => _db = db;

    public async Task<IReadOnlyList<PropertyTypeDto>> ListPropertyTypesAsync(CancellationToken ct = default) =>
        await _db.PropertyTypes.AsNoTracking()
            .OrderBy(t => t.Name)
            .Select(t => new PropertyTypeDto(t.Id, t.Name, t.Description))
            .ToListAsync(ct);

    // Only active features — a retired amenity should stop being offered on new listings
    // without disappearing from listings that already carry it.
    public async Task<IReadOnlyList<FeatureCatalogItemDto>> ListFeaturesAsync(CancellationToken ct = default) =>
        await _db.Features.AsNoTracking()
            .Where(f => f.IsActive)
            .OrderBy(f => f.Name)
            .Select(f => new FeatureCatalogItemDto(f.Id, f.Name, f.ValueType, f.Icon))
            .ToListAsync(ct);
}
