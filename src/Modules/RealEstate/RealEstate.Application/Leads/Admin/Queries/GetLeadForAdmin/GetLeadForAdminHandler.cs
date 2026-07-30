using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Properties.Admin.Policies;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Leads.Admin.Queries.GetLeadForAdmin;

public sealed class GetLeadForAdminHandler : IQueryHandler<GetLeadForAdminQuery, LeadDetailsDto>
{
    private readonly ILeadQueries _queries;
    private readonly PropertyAuthorizationPolicy _authorization;

    public GetLeadForAdminHandler(ILeadQueries queries, PropertyAuthorizationPolicy authorization)
    {
        _queries = queries;
        _authorization = authorization;
    }

    public async Task<Result<LeadDetailsDto>> Handle(GetLeadForAdminQuery request, CancellationToken cancellationToken)
    {
        var canAccess = _authorization.CanAccessAdmin();
        if (canAccess.IsError) return canAccess.TopError;

        var lead = await _queries.GetByIdAsync(request.Id, cancellationToken);
        if (lead is null) return LeadErrors.NotFound;
        return lead;
    }
}
