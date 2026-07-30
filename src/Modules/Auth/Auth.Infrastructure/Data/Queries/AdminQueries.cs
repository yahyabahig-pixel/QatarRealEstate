using Auth.Application.Abstractions.Common;
using Auth.Application.Abstractions.Persistence;
using Auth.Contracts.Responses;
using Microsoft.EntityFrameworkCore;

namespace Auth.Infrastructure.Data.Queries;

// Read side: EF projections straight to DTOs — no aggregates loaded, no tracking.
public sealed class AdminQueries : IAdminQueries
{
    private readonly AuthDbContext _db;

    public AdminQueries(AuthDbContext db) => _db = db;

    public async Task<AdminDto?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var row = await _db.Users.AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id, u.Email, u.FullName, u.IsMainAdmin, u.IsActive, u.PositionId, u.CreatedAtUtc,
                PositionName = _db.Positions.Where(p => p.Id == u.PositionId).Select(p => p.Name).FirstOrDefault(),
                Permissions = _db.Positions.Where(p => p.Id == u.PositionId)
                    .SelectMany(p => p.Permissions.Select(pp => pp.PermissionName)).ToList(),
            })
            .FirstOrDefaultAsync(ct);

        return row is null
            ? null
            : new AdminDto(row.Id, row.Email ?? string.Empty, row.FullName, row.IsMainAdmin,
                           row.IsActive, row.PositionId, row.PositionName, row.Permissions, row.CreatedAtUtc);
    }

    public async Task<PagedResult<AdminListItemDto>> ListAsync(
        string? search, bool? isActive, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Users.AsNoTracking();

        if (search is not null)
            query = query.Where(u => u.FullName.Contains(search) || u.Email!.Contains(search));

        if (isActive is not null)
            query = query.Where(u => u.IsActive == isActive);

        var total = await query.CountAsync(ct);
        if (total == 0) return PagedResult<AdminListItemDto>.Empty(page, pageSize);

        var items = await query
            .OrderByDescending(u => u.IsMainAdmin).ThenBy(u => u.FullName)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(u => new AdminListItemDto(
                u.Id, u.Email ?? string.Empty, u.FullName, u.IsMainAdmin, u.IsActive,
                _db.Positions.Where(p => p.Id == u.PositionId).Select(p => p.Name).FirstOrDefault(),
                u.CreatedAtUtc))
            .ToListAsync(ct);

        return new PagedResult<AdminListItemDto>(items, page, pageSize, total);
    }

    public async Task<CurrentAdminDto?> GetCurrentAsync(Guid id, CancellationToken ct = default)
    {
        var row = await _db.Users.AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id, u.Email, u.FullName, u.IsMainAdmin, u.PositionId,
                PositionName = _db.Positions.Where(p => p.Id == u.PositionId).Select(p => p.Name).FirstOrDefault(),
                Permissions = _db.Positions.Where(p => p.Id == u.PositionId)
                    .SelectMany(p => p.Permissions.Select(pp => pp.PermissionName)).ToList(),
                Roles = (from ur in _db.UserRoles
                         join r in _db.Roles on ur.RoleId equals r.Id
                         where ur.UserId == u.Id
                         select r.Name!).ToList(),
            })
            .FirstOrDefaultAsync(ct);

        return row is null
            ? null
            : new CurrentAdminDto(row.Id, row.Email ?? string.Empty, row.FullName,
                                  row.IsMainAdmin, row.PositionName, row.Roles, row.Permissions);
    }
}
