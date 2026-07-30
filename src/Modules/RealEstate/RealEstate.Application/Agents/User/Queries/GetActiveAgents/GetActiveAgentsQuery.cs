using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Agents.User.Queries.GetActiveAgents;

// Public "Find an Agent" listing — active agents only.
public sealed record GetActiveAgentsQuery : IQuery<IReadOnlyList<AgentDto>>;
