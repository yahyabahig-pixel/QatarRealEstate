using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Developments.User.Queries.GetDevelopmentBySlug;

// Public project page: /development/{slug}.
public sealed record GetDevelopmentBySlugQuery(string Slug) : IQuery<DevelopmentDto>;
