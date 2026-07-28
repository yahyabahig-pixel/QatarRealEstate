using RealEstate.Application.Areas;

namespace RealEstate.Application.Abstractions.Persistence;

// Read side — projects straight to DTOs with AsNoTracking, mirroring the other query services.
public interface IAreaQueries
{
    Task<IReadOnlyList<AreaDto>> ListAsync(CancellationToken ct = default);
    Task<AreaDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<AreaDto?> GetBySlugAsync(string slug, CancellationToken ct = default);
}
