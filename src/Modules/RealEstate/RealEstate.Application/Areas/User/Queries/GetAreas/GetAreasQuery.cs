using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Areas.User.Queries.GetAreas;

// Public areas index — every area with its computed live-listing count.
// The admin list endpoint reuses this same query.
public sealed record GetAreasQuery : IQuery<IReadOnlyList<AreaDto>>;
