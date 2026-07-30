using RealEstate.Application.Developments;

namespace RealEstate.Application.Abstractions.Persistence;

// Read side — projects straight to DTOs with AsNoTracking, mirroring IAgentQueries.
public interface IDevelopmentQueries
{
    Task<IReadOnlyList<DevelopmentDto>> ListAsync(CancellationToken ct = default);
    Task<DevelopmentDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<DevelopmentDto?> GetBySlugAsync(string slug, CancellationToken ct = default);
}
