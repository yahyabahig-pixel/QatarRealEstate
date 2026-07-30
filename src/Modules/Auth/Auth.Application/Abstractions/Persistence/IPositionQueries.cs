using Auth.Contracts.Responses;

namespace Auth.Application.Abstractions.Persistence;

public interface IPositionQueries
{
    Task<PositionDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<PositionDto>> ListAsync(CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetPermissionsAsync(Guid positionId, CancellationToken ct = default);
}
