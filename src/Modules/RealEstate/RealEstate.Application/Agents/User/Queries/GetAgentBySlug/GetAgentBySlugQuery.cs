using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Agents.User.Queries.GetAgentBySlug;

// Public agent profile page: /find-agent/{slug}. Inactive agents 404 here on purpose.
public sealed record GetAgentBySlugQuery(string Slug) : IQuery<AgentDto>;
