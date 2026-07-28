using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Areas;
using RealEstate.Domain.Entities;
using RealEstate.Domain.Enums;

namespace RealEstate.Infrastructure.Data.Queries;

public sealed class AreaQueries : IAreaQueries
{
    private readonly RealEstateDbContext _db;
    public AreaQueries(RealEstateDbContext db) => _db = db;

    public async Task<IReadOnlyList<AreaDto>> ListAsync(CancellationToken ct = default) =>
        await _db.Areas.AsNoTracking()
            .OrderBy(a => a.Name)
            .Select(Projection(_db))
            .ToListAsync(ct);

    public Task<AreaDto?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Areas.AsNoTracking()
            .Where(a => a.Id == id)
            .Select(Projection(_db))
            .FirstOrDefaultAsync(ct);

    public Task<AreaDto?> GetBySlugAsync(string slug, CancellationToken ct = default) =>
        _db.Areas.AsNoTracking()
            .Where(a => a.Slug == slug)
            .Select(Projection(_db))
            .FirstOrDefaultAsync(ct);

    // PropertyCount = LIVE listings only (published + active): what a visitor would actually
    // see if they clicked through. Computed as a correlated subquery — one SQL roundtrip.
    private static System.Linq.Expressions.Expression<Func<Area, AreaDto>> Projection(RealEstateDbContext db) =>
        a => new AreaDto(
            a.Id, a.Name, a.Slug, a.PhotoUrl, a.Intro,
            db.Properties.Count(p =>
                p.AreaId == a.Id &&
                p.Status == PropertyStatus.Published &&
                p.IsActive));
}
