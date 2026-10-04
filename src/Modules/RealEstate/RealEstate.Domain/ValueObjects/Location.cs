using System.Globalization;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Domain.ValueObjects;

/// <summary>
/// Location as a DDD value object. Immutable, with a factory and validation that uses domain errors.
/// Keeps property names compatible with existing code (no DB id here — value object).
///
/// X = LONGITUDE, Y = LATITUDE, both stored as strings. That is the convention everywhere in
/// this domain, and Property mirrors them into real float columns for the map.
/// </summary>
public sealed record Location
{
    public string CountryName { get; init; } = null!;
    public string CityName { get; init; } = null!;
    public string StreetName { get; init; } = null!;
    public string? PostalCode { get; init; } = null!;
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

        // Validated EXACTLY as Property.SetLocation later parses it.
        //
        // These used to disagree: this check called double.TryParse with the ambient culture
        // and default styles, which accepts a comma as a thousands separator, while
        // SetLocation parses with NumberStyles.Float and InvariantCulture, which does not.
        // "51,5310" therefore passed validation and then failed to parse, and the listing was
        // saved with NO usable coordinates and no error anywhere — it simply never appeared on
        // the map. Same parser, same rules, one answer.
        if (!TryParseCoordinate(xCoordinate, -180, 180, out _) ||
            !TryParseCoordinate(yCoordinate, -90, 90, out _))
            return LocationErrors.CoordinatesInvalid;

        var location = new Location(country.Trim(), city.Trim(), street.Trim(), postalCode.Trim(),
                                    state?.Trim() ?? string.Empty, xCoordinate.Trim(), yCoordinate.Trim(), description?.Trim());

        return location;
    }

    /// <summary>
    /// The one way a coordinate string becomes a number in this domain: invariant culture,
    /// plain decimal, and inside its real-world range.
    /// </summary>
    public static bool TryParseCoordinate(string? value, double min, double max, out double parsed)
    {
        parsed = 0;

        if (string.IsNullOrWhiteSpace(value))
            return false;

        if (!double.TryParse(value.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out parsed))
            return false;

        if (double.IsNaN(parsed) || double.IsInfinity(parsed))
            return false;

        return parsed >= min && parsed <= max;
    }
}
