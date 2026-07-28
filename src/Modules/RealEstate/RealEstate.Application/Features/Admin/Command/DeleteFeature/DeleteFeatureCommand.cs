using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Features.Admin.Command.DeleteFeature;

public sealed record DeleteFeatureCommand(Guid Id) : ICommand<Deleted>;
