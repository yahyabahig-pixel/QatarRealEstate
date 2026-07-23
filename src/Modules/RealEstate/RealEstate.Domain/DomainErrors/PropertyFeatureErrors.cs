using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class PropertyFeatureErrors
{
    public static Error PropertyIdInvalid =>
        Error.Validation("PropertyFeature.PropertyId.Invalid", "Property ID must be greater than 0.");

    public static Error FeatureIdInvalid =>
        Error.Validation("PropertyFeature.FeatureId.Invalid", "Feature ID must be greater than 0.");

    public static Error FeatureNameRequired =>
        Error.Validation("PropertyFeature.FeatureName.Required", "Feature name is required.");

    public static Error FeatureValueRequired =>
        Error.Validation("PropertyFeature.FeatureValue.Required", "Feature value is required.");
}