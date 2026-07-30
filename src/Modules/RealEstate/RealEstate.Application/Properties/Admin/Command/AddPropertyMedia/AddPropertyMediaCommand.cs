using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Command.AddPropertyMedia;

namespace RealEstate.Application.Properties.Admin.Command.AddPropertyMedia;

public sealed record AddPropertyMediaCommand(Guid PropertyId, IReadOnlyList<MediaInput> Items) : ICommand<Updated>;