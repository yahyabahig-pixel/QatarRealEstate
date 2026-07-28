using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class DevelopmentErrors
{
    public static Error NotFound =>
        Error.NotFound("Development.NotFound", "The requested development was not found.");

    public static Error NameRequired =>
        Error.Validation("Development.NameRequired", "Development name is required.");

    public static Error AreaRequired =>
        Error.Validation("Development.AreaRequired", "Development area/location is required.");

    public static Error CoverImageRequired =>
        Error.Validation("Development.CoverImageRequired", "Development cover image URL is required.");

    public static Error DeliveryYearInvalid =>
        Error.Validation("Development.DeliveryYearInvalid", "Delivery year must be between 2000 and 2100.");

    public static Error UnitsCountInvalid =>
        Error.Validation("Development.UnitsCountInvalid", "Units count cannot be negative.");

    public static Error StartingPriceInvalid =>
        Error.Validation("Development.StartingPriceInvalid", "Starting price cannot be negative.");

    public static Error SlugRequired =>
        Error.Validation("Development.SlugRequired", "Development slug is required.");

    public static Error SlugTaken =>
        Error.Conflict("Development.SlugTaken", "Another development already uses this slug.");
}
