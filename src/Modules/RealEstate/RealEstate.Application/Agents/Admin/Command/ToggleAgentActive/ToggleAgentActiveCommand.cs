using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Agents.Admin.Command.ToggleAgentActive;

public sealed record ToggleAgentActiveCommand(Guid Id, bool IsActive) : ICommand<Updated>;
