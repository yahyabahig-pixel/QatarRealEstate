using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Properties.Admin.Command.DeleteProperty;

public sealed record DeletePropertyCommand(Guid Id) : ICommand<Deleted>;
