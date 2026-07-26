using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.User.Queries.GetPropertyDetails.Dtos;

namespace RealEstate.Application.Properties.User.Queries.GetPropertyDetails;

public sealed class GetPropertyDetailsHandler : IQueryHandler<GetPropertyDetailsQuery, PropertyDetailsDto>
{
    private readonly IPropertyQueries _queries;
    public GetPropertyDetailsHandler(IPropertyQueries queries) => _queries = queries;
    public async Task<Result<PropertyDetailsDto>> Handle(GetPropertyDetailsQuery query, CancellationToken cancellationToken)
    {
        var dto = await _queries.GetDetailsAsync(query.PropertyId, cancellationToken);

        return dto is null
             ? Error.NotFound("Property.NotFound", "Property was not found.")
             : dto;
    }
}