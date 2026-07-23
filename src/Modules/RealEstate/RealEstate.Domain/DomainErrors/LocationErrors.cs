using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class LocationErrors
{
    public static Error CountryRequired =>
        Error.Validation("Location.Country.Required", "Country name is required.");

    public static Error CityRequired =>
        Error.Validation("Location.City.Required", "City name is required.");

    public static Error StreetRequired =>
        Error.Validation("Location.Street.Required", "Street name is required.");

    public static Error PostalCodeRequired =>
        Error.Validation("Location.PostalCode.Required", "Postal code is required.");

    public static Error CoordinatesInvalid =>
        Error.Validation("Location.Coordinates.Invalid", "Coordinates must be valid.");
}