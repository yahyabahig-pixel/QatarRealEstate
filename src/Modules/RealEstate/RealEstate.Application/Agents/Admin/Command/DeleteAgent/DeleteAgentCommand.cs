using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Agents.Admin.Command.DeleteAgent;

public sealed record DeleteAgentCommand(Guid Id) : ICommand<Deleted>;
