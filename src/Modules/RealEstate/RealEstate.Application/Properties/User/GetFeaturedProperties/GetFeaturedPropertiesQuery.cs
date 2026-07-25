using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.User.SearchProperties;

public sealed record GetFeaturedPropertiesQuery(int Take = 8)
    : IQuery<IReadOnlyList<PropertyListItem>>;