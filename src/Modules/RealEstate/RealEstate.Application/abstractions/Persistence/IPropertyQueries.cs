
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Properties.User.SearchProperties;


public interface IPropertyQueries
{
    Task<PagedResult<PropertyListItem>> SearchAsync(PropertySearchCriteria criteria, CancellationToken ct = default);
    Task<IReadOnlyList<PropertyListItem>> GetFeaturedAsync(int take, CancellationToken ct = default);
    Task<Result<IReadOnlyList<PropertyListItem>>> GetRelatedAsync(Guid id, int take, CancellationToken ct = default);

}
