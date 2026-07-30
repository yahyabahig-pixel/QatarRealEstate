using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Agents.Admin.Queries.ListAgentsForAdmin;

// Admin sees everything, including deactivated agents.
public sealed record ListAgentsForAdminQuery : IQuery<IReadOnlyList<AgentDto>>;
