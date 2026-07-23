using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class MediaErrors
{
    public static Error UrlRequired =>
        Error.Validation("Media.Url.Required", "Media URL is required.");

    public static Error MediaTypeRequired =>
        Error.Validation("Media.MediaType.Required", "Media type is required.");

    public static Error InvalidDimensions =>
        Error.Validation("Media.Dimensions.Invalid", "Width and height must be greater than 0.");

    public static Error InvalidOrder =>
        Error.Validation("Media.Order.Invalid", "Media order must be greater than or equal to 0.");

    public static Error InvalidPropertyId =>
        Error.Validation("Media.PropertyId.Invalid", "Property ID must be greater than 0.");

    public static Error MultiplePrimaryMedia =>
        Error.Validation("Property.Media.MultiplePrimary", "A property must have exactly one primary image.");

    public static Error MediaNotFound =>
        Error.NotFound("Property.Media.NotFound", "The requested media item was not found.");

    public static Error TooManyMediaItems =>
        Error.Validation("Property.Media.TooMany", "A property cannot have more than 20 media items.");

    public static Error MediaRequired =>
        Error.Validation("Property.Media.Required", "At least one media item is required for the property.");
}
