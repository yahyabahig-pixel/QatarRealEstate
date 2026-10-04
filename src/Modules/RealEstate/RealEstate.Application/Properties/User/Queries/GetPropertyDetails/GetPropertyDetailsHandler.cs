using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.User.Queries.GetPropertyDetails.Dtos;

namespace RealEstate.Application.Properties.User.Queries.GetPropertyDetails;

// The PUBLIC details endpoint. adminView: false is the entire security boundary here — an
// unpublished, archived or deactivated listing comes back as "not found", which is what
// unpublishing is supposed to mean. Before this, unpublishing hid a listing from every list
// while leaving its page fully readable through the link it already had.
public sealed class GetPropertyDetailsHandler : IQueryHandler<GetPropertyDetailsQuery, PropertyDetailsDto>
{
    private readonly IPropertyQueries _queries;
    public GetPropertyDetailsHandler(IPropertyQueries queries) => _queries = queries;

    public async Task<Result<PropertyDetailsDto>> Handle(GetPropertyDetailsQuery query, CancellationToken cancellationToken)
    {
        var dto = await _queries.GetDetailsAsync(query.PropertyId, adminView: false, cancellationToken);

        return dto is null
             ? Error.NotFound("Property.NotFound", "Property was not found.")
             : dto;
    }
}
