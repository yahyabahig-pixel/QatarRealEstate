using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Catalog.User.Queries.GetPropertyTypes;

public sealed record GetPropertyTypesQuery : IQuery<IReadOnlyList<PropertyTypeDto>>;
