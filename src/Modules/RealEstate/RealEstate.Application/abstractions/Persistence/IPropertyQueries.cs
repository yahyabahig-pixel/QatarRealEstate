
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Properties.User.Queries.GetPropertyDetails.Dtos;
using RealEstate.Application.Properties.User.Queries.SearchProperties;



public interface IPropertyQueries
{
    Task<PagedResult<PropertyListItem>> SearchAsync(PropertySearchCriteria criteria, CancellationToken ct = default);
    Task<IReadOnlyList<PropertyListItem>> GetFeaturedAsync(int take, CancellationToken ct = default);
    Task<PropertyDetailsDto?> GetDetailsAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<PropertyListItem>> GetRelatedAsync(Guid id, int take, CancellationToken ct = default);
}
