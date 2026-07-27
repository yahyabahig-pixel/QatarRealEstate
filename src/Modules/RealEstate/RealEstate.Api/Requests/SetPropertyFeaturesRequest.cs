using RealEstate.Application.Properties.Admin.Command.featureSelection;

namespace RealEstate.Api.Requests;

public sealed record SetPropertyFeaturesRequest(IReadOnlyList<FeatureSelectionInput> Features);