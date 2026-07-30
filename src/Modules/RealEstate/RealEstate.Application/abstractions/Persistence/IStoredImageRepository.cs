using RealEstate.Domain.Entities;

namespace RealEstate.Application.Abstractions.Persistence;

public interface IStoredImageRepository
{
    Task<StoredImage?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(StoredImage image, CancellationToken ct = default);
    void Remove(StoredImage image);
}
