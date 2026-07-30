using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Agents.Admin.Queries.GetAgentById;

// Admin detail — also the route target for the 201 Location header from Create.
public sealed record GetAgentByIdQuery(Guid Id) : IQuery<AgentDto>;
