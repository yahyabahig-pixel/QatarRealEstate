using BuildingBlocks.Common.Results;
using BuildingBlocks.Common.Results.Errors;

namespace RealEstate.Application.Common.Errors;

public static class ApplicationErrors
{
    public static Error PropertyNotFound =>
        Error.NotFound(
            "ApplicationErrors.Property.NotFound",
            "Property does not exist.");

    public static Error PropertyTypeNotFound =>
        Error.NotFound(
            "ApplicationErrors.PropertyType.NotFound",
            "PropertyType does not exist.");

    public static Error FeatureNotFound =>
        Error.NotFound(
            "ApplicationErrors.Feature.NotFound",
            "Feature does not exist.");

    public static Error DuplicateActiveListing =>
        Error.Conflict(
            "ApplicationErrors.Property.DuplicateActiveListing",
            "An active listing already exists for this property.");

    public static Error Unauthorized =>
        Error.Unauthorized(
            "ApplicationErrors.User.Unauthorized",
            "You are not authorized to perform this action.");
}
