using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Developments.User.Queries.GetDevelopments;

// Public developments index — there is no draft/active concept for projects, so this is
// the full catalog. The admin list endpoint reuses this same query.
public sealed record GetDevelopmentsQuery : IQuery<IReadOnlyList<DevelopmentDto>>;
