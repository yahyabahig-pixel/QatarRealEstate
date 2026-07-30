using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Leads;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Abstractions.Persistence;

public sealed record LeadAdminFilter(
    string? Text,
    LeadType? Type,
    LeadStatus? Status,
    int Page,
    int PageSize);

public interface ILeadQueries
{
    Task<PagedResult<LeadAdminListItemDto>> ListForAdminAsync(LeadAdminFilter filter, CancellationToken ct = default);
    Task<LeadDetailsDto?> GetByIdAsync(Guid id, CancellationToken ct = default);
}
