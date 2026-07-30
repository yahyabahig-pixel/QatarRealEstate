using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Areas.Admin.Command.CreateArea;

public sealed record CreateAreaCommand(
    string Name,
    string PhotoUrl,
    string? Slug = null,          // omitted → derived from Name
    string? Intro = null) : ICommand<Guid>;
