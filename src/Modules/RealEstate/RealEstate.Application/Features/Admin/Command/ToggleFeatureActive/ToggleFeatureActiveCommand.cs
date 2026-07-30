using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Features.Admin.Command.ToggleFeatureActive;

// Deactivating is the safe alternative to deleting: the feature disappears from the
// property form's options but keeps its history on listings that already carry it.
public sealed record ToggleFeatureActiveCommand(Guid Id, bool IsActive) : ICommand<Updated>;
