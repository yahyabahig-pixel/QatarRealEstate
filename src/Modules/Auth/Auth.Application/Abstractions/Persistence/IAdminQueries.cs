using Auth.Application.Abstractions.Common;
using Auth.Contracts.Responses;

namespace Auth.Application.Abstractions.Persistence;

// Read side — EF projections straight to DTOs, same pattern as IPropertyQueries.
public interface IAdminQueries
{
    Task<AdminDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PagedResult<AdminListItemDto>> ListAsync(string? search, bool? isActive,
        int page, int pageSize, CancellationToken ct = default);
    Task<CurrentAdminDto?> GetCurrentAsync(Guid id, CancellationToken ct = default);
}
