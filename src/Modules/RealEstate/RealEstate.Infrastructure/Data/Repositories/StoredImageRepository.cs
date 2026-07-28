using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Repositories;

public sealed class StoredImageRepository : IStoredImageRepository
{
    private readonly RealEstateDbContext _db;
    public StoredImageRepository(RealEstateDbContext db) => _db = db;

    public Task<StoredImage?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.StoredImages.FirstOrDefaultAsync(i => i.Id == id, ct);

    public async Task AddAsync(StoredImage image, CancellationToken ct = default) =>
        await _db.StoredImages.AddAsync(image, ct);

    public void Remove(StoredImage image) => _db.StoredImages.Remove(image);
}
