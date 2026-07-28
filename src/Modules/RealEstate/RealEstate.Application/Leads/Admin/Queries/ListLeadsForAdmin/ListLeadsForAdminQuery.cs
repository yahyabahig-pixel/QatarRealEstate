using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Leads.Admin.Queries.ListLeadsForAdmin;

public sealed record ListLeadsForAdminQuery(
    string? Q = null,
    LeadType? Type = null,
    LeadStatus? Status = null,
    int Page = 1,
    int PageSize = 50) : IQuery<PagedResult<LeadAdminListItemDto>>;
