using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Agents.Admin.Command.UpdateAgent;

public sealed record UpdateAgentCommand(
    Guid Id,
    string Name,
    string JobTitle,
    string PhotoUrl,
    string? Slug,
    string? Phone,
    string? WhatsApp,
    string? Email,
    decimal Rating,
    string? Bio) : ICommand<Updated>;
