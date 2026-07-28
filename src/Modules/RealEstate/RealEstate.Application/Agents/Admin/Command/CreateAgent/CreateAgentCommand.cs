using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Agents.Admin.Command.CreateAgent;

public sealed record CreateAgentCommand(
    string Name,
    string JobTitle,
    string PhotoUrl,
    string? Slug = null,          // omitted → derived from Name
    string? Phone = null,
    string? WhatsApp = null,
    string? Email = null,
    decimal Rating = 0m,
    string? Bio = null) : ICommand<Guid>;
