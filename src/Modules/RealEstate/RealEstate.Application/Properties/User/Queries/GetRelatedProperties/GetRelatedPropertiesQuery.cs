using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.User.Queries.SearchProperties;
namespace RealEstate.Application.Properties.User.Queries.GetRelatedProperties;

public sealed record GetRelatedPropertiesQuery(Guid Id, int Take = 4)
    : IQuery<IReadOnlyList<PropertyListItem>>;
