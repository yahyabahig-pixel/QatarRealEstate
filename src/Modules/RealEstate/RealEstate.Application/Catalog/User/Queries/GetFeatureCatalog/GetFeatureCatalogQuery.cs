using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Catalog.User.Queries.GetFeatureCatalog;

public sealed record GetFeatureCatalogQuery : IQuery<IReadOnlyList<FeatureCatalogItemDto>>;
