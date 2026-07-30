using Auth.Application.Abstractions.Persistence;
using Auth.Domain.Entities;
using Auth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;

namespace Auth.Infrastructure.Data.Repositories;

public sealed class PositionRepository : IPositionRepository
{
    private readonly AuthDbContext _db;

    public PositionRepository(AuthDbContext db) => _db = db;

    public Task<Position?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Positions.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Position?> GetByIdWithPermissionsAsync(Guid id, CancellationToken ct = default) =>
        _db.Positions
           .Include(p => p.Permissions)
           .FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<bool> ExistsByNameAsync(string name, Guid? excludeId = null, CancellationToken ct = default)
    {
        var trimmed = name.Trim();
        return _db.Positions.AnyAsync(
            p => p.Name == trimmed && (excludeId == null || p.Id != excludeId), ct);
    }

    public Task<bool> IsAssignedToAnyAdminAsync(Guid positionId, CancellationToken ct = default) =>
        _db.Users.AnyAsync(u => u.PositionId == positionId, ct);

    public async Task AddAsync(Position position, CancellationToken ct = default) =>
        await _db.Positions.AddAsync(position, ct);

    public void Remove(Position position) => _db.Positions.Remove(position);
}
