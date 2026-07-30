using RealEstate.Application.Media;

namespace RealEstate.Application.Abstractions.Persistence;

public interface IStoredImageQueries
{
    Task<StoredImageContentDto?> GetContentAsync(Guid id, CancellationToken ct = default);
}
