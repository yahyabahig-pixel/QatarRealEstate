using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Domain.ValueObjects;

/// <summary>
/// Location as a DDD value object. Immutable, with a factory and validation that uses domain errors.
/// Keeps property names compatible with existing code (no DB id here — value object).
/// </summary>
public sealed record Location
{
    public string CountryName { get; init; } = null!;
    public string CityName { get; init; } = null!;
    public string StreetName { get; init; } = null!;
    public string PostalCode { get; init; } = null!;
    public string State { get; init; } = null!;
    public string XCoordinate { get; init; } = null!;
    public string YCoordinate { get; init; } = null!;
    public string? Description { get; init; }

    // for serialization/ORM
    private Location() { }

    private Location(string country, string city, string street, string postalCode,
                     string state, string xCoordinate, string yCoordinate, string? description)
    {
        CountryName = country;
        CityName = city;
        StreetName = street;
        PostalCode = postalCode;
        State = state;
        XCoordinate = xCoordinate;
        YCoordinate = yCoordinate;
        Description = description;
    }

    public static Result<Location> Create(string country, string city, string street, string postalCode,
                                          string state, string xCoordinate, string yCoordinate, string? description = null)
    {
        if (string.IsNullOrWhiteSpace(country))
            return LocationErrors.CountryRequired;

        if (string.IsNullOrWhiteSpace(city))
            return LocationErrors.CityRequired;

        if (string.IsNullOrWhiteSpace(street))
            return LocationErrors.StreetRequired;

        if (string.IsNullOrWhiteSpace(postalCode))
            return LocationErrors.PostalCodeRequired;

        // Coordinates must parse to numeric values
        if (string.IsNullOrWhiteSpace(xCoordinate) || string.IsNullOrWhiteSpace(yCoordinate)
            || !double.TryParse(xCoordinate, out _) || !double.TryParse(yCoordinate, out _))
            return LocationErrors.CoordinatesInvalid;

        var location = new Location(country.Trim(), city.Trim(), street.Trim(), postalCode.Trim(),
                                    state?.Trim() ?? string.Empty, xCoordinate.Trim(), yCoordinate.Trim(), description?.Trim());

        return location;
    }
}