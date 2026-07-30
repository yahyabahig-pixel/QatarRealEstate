using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Features.Admin.Command.UpdateFeature;

// IsActive is deliberately absent — activating/deactivating is its own endpoint
// (PUT {id}/active), so a rename can never accidentally retire a feature.
public sealed record UpdateFeatureCommand(
    Guid Id,
    string Name,
    FeatureValueType ValueType,
    string? Icon) : ICommand<Updated>;
