using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Policies;
using RealEstate.Application.Properties.User.Queries.GetPropertyDetails.Dtos;

namespace RealEstate.Application.Properties.Admin.Queries.GetPropertyForAdmin;

// The admin panel's own details read.
//
// It exists because the public one stopped serving drafts: GET /api/properties/{id} is now
// published-and-active only, which is the point of unpublishing. The edit form still has to
// open a draft, and it still has to see the real figure behind "price on request", so it asks
// here instead — behind Property.Read, and with the same ownership scoping as the admin list.
public sealed record GetPropertyForAdminQuery(Guid Id) : IQuery<PropertyDetailsDto>;

public sealed class GetPropertyForAdminHandler : IQueryHandler<GetPropertyForAdminQuery, PropertyDetailsDto>
{
    private readonly IPropertyQueries _queries;
    private readonly PropertyAuthorizationPolicy _authorization;

    public GetPropertyForAdminHandler(IPropertyQueries queries, PropertyAuthorizationPolicy authorization)
    {
        _queries = queries;
        _authorization = authorization;
    }

    public async Task<Result<PropertyDetailsDto>> Handle(
        GetPropertyForAdminQuery request, CancellationToken cancellationToken)
    {
        var canAccess = _authorization.CanAccessAdmin();
        if (canAccess.IsError) return canAccess.TopError;

        var dto = await _queries.GetDetailsAsync(request.Id, adminView: true, cancellationToken);

        return dto is null
            ? Error.NotFound("Property.NotFound", "Property was not found.")
            : dto;
    }
}
