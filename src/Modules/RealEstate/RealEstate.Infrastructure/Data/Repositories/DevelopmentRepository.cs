using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Repositories;

public sealed class DevelopmentRepository : IDevelopmentRepository
{
    private readonly RealEstateDbContext _db;
    public DevelopmentRepository(RealEstateDbContext db) => _db = db;

    public Task<Development?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Developments.FirstOrDefaultAsync(d => d.Id == id, ct);

    public Task<bool> SlugTakenAsync(string slug, Guid? exceptId = null, CancellationToken ct = default) =>
        _db.Developments.AnyAsync(d => d.Slug == slug && (exceptId == null || d.Id != exceptId), ct);

    public async Task AddAsync(Development development, CancellationToken ct = default) =>
        await _db.Developments.AddAsync(development, ct);

    public void Remove(Development development) => _db.Developments.Remove(development);
}
