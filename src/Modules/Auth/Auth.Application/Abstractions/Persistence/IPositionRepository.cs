using Auth.Domain.Entities;

namespace Auth.Application.Abstractions.Persistence;

public interface IPositionRepository
{
    Task<Position?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Position?> GetByIdWithPermissionsAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsByNameAsync(string name, Guid? excludeId = null, CancellationToken ct = default);
    Task<bool> IsAssignedToAnyAdminAsync(Guid positionId, CancellationToken ct = default);
    Task AddAsync(Position position, CancellationToken ct = default);
    void Remove(Position position);
}
