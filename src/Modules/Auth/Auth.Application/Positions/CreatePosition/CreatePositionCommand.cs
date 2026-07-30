using Auth.Application.Abstractions.Messaging;

namespace Auth.Application.Positions.CreatePosition;

public sealed record CreatePositionCommand(string Name, string Description) : ICommand<Guid>;
