using RealEstate.Domain.Enums;

namespace RealEstate.Api.Requests;

// PUT body — the id comes from the route, everything else from here.
public sealed record UpdateFeatureRequest(string Name, FeatureValueType ValueType, string? Icon);
