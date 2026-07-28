using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Media.Admin.Command.DeleteImage;

public sealed record DeleteImageCommand(Guid Id) : ICommand<Deleted>;
