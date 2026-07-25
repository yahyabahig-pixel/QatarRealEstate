using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.User.Queries.SearchProperties;
namespace RealEstate.Application.Properties.User.Queries.GetFeaturedProperties;

public sealed record GetFeaturedPropertiesQuery(int Take = 8)
    : IQuery<IReadOnlyList<PropertyListItem>>;