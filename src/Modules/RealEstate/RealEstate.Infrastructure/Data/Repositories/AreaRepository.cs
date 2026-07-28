using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Repositories;

public sealed class AreaRepository : IAreaRepository
{
    private readonly RealEstateDbContext _db;
    public AreaRepository(RealEstateDbContext db) => _db = db;

    public Task<Area?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Areas.FirstOrDefaultAsync(a => a.Id == id, ct);

    public Task<bool> SlugTakenAsync(string slug, Guid? exceptId = null, CancellationToken ct = default) =>
        _db.Areas.AnyAsync(a => a.Slug == slug && (exceptId == null || a.Id != exceptId), ct);

    public Task<bool> IsInUseAsync(Guid areaId, CancellationToken ct = default) =>
        _db.Properties.AnyAsync(p => p.AreaId == areaId, ct);

    public async Task AddAsync(Area area, CancellationToken ct = default) =>
        await _db.Areas.AddAsync(area, ct);

    public void Remove(Area area) => _db.Areas.Remove(area);
}
