using RealEstate.Domain.Enums;

namespace RealEstate.Application.Catalog;

// The amenity/feature catalog as the admin property form needs it: id to send back in
// SetPropertyFeatures, name to render the chip, ValueType so the form knows whether the
// feature wants a value ("3" for Parking) or is a plain yes/no.
public sealed record FeatureCatalogItemDto(Guid Id, string Name, FeatureValueType ValueType, string? Icon);
