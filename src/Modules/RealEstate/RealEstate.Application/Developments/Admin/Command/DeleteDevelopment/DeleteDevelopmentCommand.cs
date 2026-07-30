using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Developments.Admin.Command.DeleteDevelopment;

public sealed record DeleteDevelopmentCommand(Guid Id) : ICommand<Deleted>;
