using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Properties.Admin.RemovePropertyMedia;

public sealed record RemovePropertyMediaCommand(Guid PropertyId, Guid MediaId) : ICommand<Updated>;