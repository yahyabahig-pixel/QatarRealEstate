using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Areas.Admin.Command.UpdateArea;

public sealed record UpdateAreaCommand(
    Guid Id,
    string Name,
    string PhotoUrl,
    string? Slug,
    string? Intro) : ICommand<Updated>;
