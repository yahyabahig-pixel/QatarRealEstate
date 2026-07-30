using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Command.featureSelection;
namespace RealEstate.Application.Properties.Admin.Command.SetPropertyFeatures;

public sealed record SetPropertyFeaturesCommand(
    Guid PropertyId,
    IReadOnlyList<FeatureSelectionInput> Features) : ICommand<Updated>;