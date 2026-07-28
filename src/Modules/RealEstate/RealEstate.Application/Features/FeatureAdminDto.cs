using RealEstate.Domain.Enums;

namespace RealEstate.Application.Features;

// Admin view of the feature catalog — includes IsActive, which the public catalog hides
// (the public list only ever returns active features).
public sealed record FeatureAdminDto(Guid Id, string Name, FeatureValueType ValueType, string? Icon, bool IsActive);
