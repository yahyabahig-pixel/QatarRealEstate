using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Areas.Admin.Command.DeleteArea;

public sealed record DeleteAreaCommand(Guid Id) : ICommand<Deleted>;
