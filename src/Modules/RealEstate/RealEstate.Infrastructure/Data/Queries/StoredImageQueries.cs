using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Media;

namespace RealEstate.Infrastructure.Data.Queries;

public sealed class StoredImageQueries : IStoredImageQueries
{
    private readonly RealEstateDbContext _db;
    public StoredImageQueries(RealEstateDbContext db) => _db = db;

    public Task<StoredImageContentDto?> GetContentAsync(Guid id, CancellationToken ct = default) =>
        _db.StoredImages.AsNoTracking()
            .Where(i => i.Id == id)
            .Select(i => new StoredImageContentDto(i.Data, i.ContentType, i.FileName))
            .FirstOrDefaultAsync(ct);
}
