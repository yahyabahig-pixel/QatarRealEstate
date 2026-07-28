using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Areas.User.Queries.GetAreaBySlug;

// Public area guide page: /areas/{slug}.
public sealed record GetAreaBySlugQuery(string Slug) : IQuery<AreaDto>;
