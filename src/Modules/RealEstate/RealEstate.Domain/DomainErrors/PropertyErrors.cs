using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class PropertyErrors
{
    // Title
    public static Error TitleRequired =>
        Error.Validation("Property.Title.Required", "Property title is required.");

    public static Error TitleTooShort =>
        Error.Validation("Property.Title.TooShort", "Property title must be at least 3 characters.");

    public static Error TitleTooLong =>
        Error.Validation("Property.Title.TooLong", "Property title must not exceed 150 characters.");

    // Description
    public static Error DescriptionTooLong =>
        Error.Validation("Property.Description.TooLong", "Property description must not exceed 4000 characters.");

    // Property type
    public static Error PropertyTypeRequired =>
        Error.Validation("Property.PropertyType.Required", "A property type must be specified.");

    public static Error PropertyTypeNotFound =>
        Error.NotFound("Property.PropertyType.NotFound", "The specified property type does not exist.");

    // Location
    public static Error LocationRequired =>
        Error.Validation("Property.Location.Required", "Property location is required.");

    // Listing terms (the core invariant)
    public static Error SaleTermsRequired =>
        Error.Validation("Property.SaleTerms.Required", "Sale terms are required for a property listed for sale.");

    public static Error RentTermsRequired =>
        Error.Validation("Property.RentTerms.Required", "Rent terms are required for a property listed for rent.");

    public static Error ListingTermsMissing =>
        Error.Validation("Property.ListingTerms.Missing", "A property must have either sale terms or rent terms.");

    // Media
    public static Error PrimaryMediaRequired =>
        Error.Validation("Property.Media.PrimaryRequired", "A property must have exactly one primary image.");

    // Duplicate prevention (raised in the application layer)
    public static Error DuplicateListing =>
        Error.Conflict("Property.Duplicate", "An active listing already exists for this property.");

    // Lifecycle / lookup
    public static Error NotFound =>
        Error.NotFound("Property.NotFound", "The requested property was not found.");

    public static Error AlreadyPublished =>
        Error.Conflict("Property.AlreadyPublished", "The property is already published.");

    // Property not published (used when attempting to unpublish/operate on unpublished)
    public static Error NotPublished =>
        Error.Validation("Property.NotPublished", "The property is not published.");

    // Duplicate feature (forwarder to FeatureErrors for consistency)
    public static Error DuplicateFeature => FeatureErrors.FeatureDuplicate;

    // Media (forwarders for backward compatibility)
    public static Error MultiplePrimaryMedia => MediaErrors.MultiplePrimaryMedia;
    public static Error MediaNotFound => MediaErrors.MediaNotFound;
    public static Error TooManyMediaItems => MediaErrors.TooManyMediaItems;
    public static Error MediaRequired => MediaErrors.MediaRequired;

    // Features (optional forwards)
    public static Error FeatureRequired => FeatureErrors.FeatureRequired;
    public static Error FeatureNotFound => FeatureErrors.FeatureNotFound;
    public static Error FeatureDuplicate => FeatureErrors.FeatureDuplicate;

    public static Error InvalidNumberOfRooms =>
          Error.Validation("Property.NumberOfRooms.Invalid", "Number of rooms must be greater than 0.");

    public static Error InvalidArea =>
        Error.Validation("Property.Area.Invalid", "Area must be greater than 0.");

    public static Error InvalidNumberOfBathrooms =>
        Error.Validation("Property.NumberOfBathrooms.Invalid", "Number of bathrooms must be greater than 0.");

    public static Error NotPublishable =>
        Error.Validation("Property.NotPublishable", "The property cannot be published in its current state.");

    public static Error AlreadyArchived =>
        Error.Conflict("Property.AlreadyArchived", "The property is already archived.");
}
