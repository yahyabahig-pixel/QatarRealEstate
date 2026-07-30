using RealEstate.Application.Agents;

namespace RealEstate.Application.Abstractions.Persistence;

// Read side — projects straight to DTOs with AsNoTracking, mirroring IPropertyQueries.
public interface IAgentQueries
{
    Task<IReadOnlyList<AgentDto>> ListAsync(bool includeInactive, CancellationToken ct = default);
    Task<AgentDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<AgentDto?> GetBySlugAsync(string slug, bool includeInactive, CancellationToken ct = default);
}
