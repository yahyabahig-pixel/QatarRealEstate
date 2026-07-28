using Auth.Application.Abstractions.Persistence;
using Auth.Contracts.Responses;
using Microsoft.EntityFrameworkCore;

namespace Auth.Infrastructure.Data.Queries;

public sealed class PositionQueries : IPositionQueries
{
    private readonly AuthDbContext _db;

    public PositionQueries(AuthDbContext db) => _db = db;

    public async Task<PositionDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var row = await _db.Positions.AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id, p.Name, p.Description, p.IsActive,
                Permissions = p.Permissions.Select(pp => pp.PermissionName).ToList(),
                AdminCount = _db.Users.Count(u => u.PositionId == p.Id),
            })
            .FirstOrDefaultAsync(ct);

        return row is null
            ? null
            : new PositionDto(row.Id, row.Name, row.Description, row.IsActive, row.Permissions, row.AdminCount);
    }

    public async Task<IReadOnlyList<PositionDto>> ListAsync(CancellationToken ct = default)
    {
        var rows = await _db.Positions.AsNoTracking()
            .OrderBy(p => p.Name)
            .Select(p => new
            {
                p.Id, p.Name, p.Description, p.IsActive,
                Permissions = p.Permissions.Select(pp => pp.PermissionName).ToList(),
                AdminCount = _db.Users.Count(u => u.PositionId == p.Id),
            })
            .ToListAsync(ct);

        return rows
            .Select(r => new PositionDto(r.Id, r.Name, r.Description, r.IsActive, r.Permissions, r.AdminCount))
            .ToList();
    }

    public async Task<IReadOnlyList<string>> GetPermissionsAsync(Guid positionId, CancellationToken ct = default) =>
        await _db.Positions.AsNoTracking()
            .Where(p => p.Id == positionId)
            .SelectMany(p => p.Permissions.Select(pp => pp.PermissionName))
            .ToListAsync(ct);
}
