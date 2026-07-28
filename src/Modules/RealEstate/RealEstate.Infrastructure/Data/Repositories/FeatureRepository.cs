using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Repositories;

public sealed class FeatureRepository : IFeatureRepository
{
    private readonly RealEstateDbContext _db;
    public FeatureRepository(RealEstateDbContext db) => _db = db;

    public Task<Feature?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Features.FirstOrDefaultAsync(f => f.Id == id, ct);

    public async Task<IReadOnlyList<Feature>> GetActiveByIdsAsync(
        IReadOnlyCollection<Guid> ids, CancellationToken ct = default) =>
        await _db.Features
                 .Where(f => f.IsActive && ids.Contains(f.Id))
                 .ToListAsync(ct);

    public Task<bool> ExistsByNameAsync(string name, Guid? exceptId = null, CancellationToken ct = default) =>
        _db.Features.AnyAsync(f => f.Name == name.Trim() && (exceptId == null || f.Id != exceptId), ct);

    // PropertyFeature has no public DbSet (it lives inside the Property aggregate),
    // so this read goes through Set<T>() — read-only, no aggregate rule is bypassed.
    public Task<bool> IsInUseAsync(Guid featureId, CancellationToken ct = default) =>
        _db.Set<PropertyFeature>().AnyAsync(pf => pf.FeatureId == featureId, ct);

    public async Task AddAsync(Feature feature, CancellationToken ct = default) =>
        await _db.Features.AddAsync(feature, ct);

    public void Remove(Feature feature) => _db.Features.Remove(feature);
}
