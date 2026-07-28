using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Developments;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Queries;

public sealed class DevelopmentQueries : IDevelopmentQueries
{
    private readonly RealEstateDbContext _db;
    public DevelopmentQueries(RealEstateDbContext db) => _db = db;

    public async Task<IReadOnlyList<DevelopmentDto>> ListAsync(CancellationToken ct = default) =>
        await _db.Developments.AsNoTracking()
            .OrderBy(d => d.DeliveryYear).ThenBy(d => d.Name)
            .Select(Projection)
            .ToListAsync(ct);

    public Task<DevelopmentDto?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Developments.AsNoTracking()
            .Where(d => d.Id == id)
            .Select(Projection)
            .FirstOrDefaultAsync(ct);

    public Task<DevelopmentDto?> GetBySlugAsync(string slug, CancellationToken ct = default) =>
        _db.Developments.AsNoTracking()
            .Where(d => d.Slug == slug)
            .Select(Projection)
            .FirstOrDefaultAsync(ct);

    // Single projection shared by every query — SQL-translatable, no entity materialization.
    private static readonly System.Linq.Expressions.Expression<Func<Development, DevelopmentDto>> Projection =
        d => new DevelopmentDto(
            d.Id, d.Name, d.Slug,
            new DevelopmentLocationDto(
                d.Location.CountryName, d.Location.CityName, d.Location.StreetName,
                d.Location.State, d.Location.XCoordinate, d.Location.YCoordinate,
                d.Location.Description),
            d.DeliveryYear, d.CoverImageUrl,
            d.Description, d.UnitsCount, d.DeveloperName, d.StartingPrice, d.PaymentPlan);
}
