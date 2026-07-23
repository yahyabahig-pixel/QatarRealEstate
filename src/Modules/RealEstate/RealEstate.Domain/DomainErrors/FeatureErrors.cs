using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class FeatureErrors
{
    public static Error FeatureRequired =>
        Error.Validation("Property.Feature.Required", "Feature is required.");

    public static Error FeatureNotFound =>
        Error.NotFound("Property.Feature.NotFound", "The requested feature was not found.");

    public static Error FeatureDuplicate =>
        Error.Conflict("Property.Feature.Duplicate", "The feature already exists for this property.");
}