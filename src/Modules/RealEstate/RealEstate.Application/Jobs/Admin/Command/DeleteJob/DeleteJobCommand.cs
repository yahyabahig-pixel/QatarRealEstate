using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Jobs.Admin.Command.DeleteJob;

public sealed record DeleteJobCommand(Guid Id) : ICommand<Deleted>;
