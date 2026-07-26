
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
namespace RealEstate.Application.Properties.User.Command.RecordPropertyView;

public sealed record RecordPropertyViewCommand(Guid PropertyId) : ICommand<Updated>;
