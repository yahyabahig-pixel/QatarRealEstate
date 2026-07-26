using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;


public sealed class PropertyRepository : IPropertyRepository
{
    private readonly RealEstateDbContext _db;
    public PropertyRepository(RealEstateDbContext db) => _db = db;

    public Task<Property?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Properties.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Property?> GetByIdWithMediaAsync(Guid id, CancellationToken ct = default) =>
        _db.Properties
           .Include(p => p.Media)                    // loads into the _media backing field
           .FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Property?> GetByIdWithFeaturesAsync(Guid id, CancellationToken ct = default) =>
        _db.Properties
           .Include(p => p.PropertyFeatures)
           .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task AddAsync(Property property, CancellationToken ct = default) =>
        await _db.Properties.AddAsync(property, ct);

    public Task<bool> PropertyTypeExistsAsync(Guid propertyTypeId, CancellationToken ct = default) =>
        _db.PropertyTypes.AnyAsync(t => t.Id == propertyTypeId, ct);
}
