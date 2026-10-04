using FluentValidation;
using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;
using RealEstate.Domain.ValueObjects;

namespace RealEstate.Application.Common;

// ---------------------------------------------------------------------------------------------
//  ONE validator for the LocationInput that every location-carrying command shares.
//
//  The lengths here are the COLUMN lengths (see PropertyConfiguration / LeadConfiguration /
//  DevelopmentConfiguration — they all map Location the same way). Where a command's validator
//  left a field unbounded, an over-long value passed validation, reached SQL Server, and came
//  back as a 500 with no indication of which field was at fault. The API should be the thing
//  that says "State is too long", not the database.
//
//  Used as a CHILD validator — RuleFor(x => x.Location).SetValidator(new LocationInputValidator())
//  — so failures are reported as "Location.State", the path the client can act on.
// ---------------------------------------------------------------------------------------------
public sealed class LocationInputValidator : AbstractValidator<LocationInput>
{
    public const int CountryMaxLength = 100;
    public const int CityMaxLength = 100;
    public const int StreetMaxLength = 200;
    public const int PostalCodeMaxLength = 20;
    public const int StateMaxLength = 100;
    public const int CoordinateMaxLength = 50;
    public const int DescriptionMaxLength = 500;

    /// <summary>Currency is stored as char(3) — "QAR", not "QATARI RIYAL".</summary>
    public const int CurrencyLength = 3;

    public LocationInputValidator()
    {
        RuleFor(x => x.Country).NotEmpty().MaximumLength(CountryMaxLength);
        RuleFor(x => x.City).NotEmpty().MaximumLength(CityMaxLength);
        RuleFor(x => x.Street).NotEmpty().MaximumLength(StreetMaxLength);
        RuleFor(x => x.PostalCode).NotEmpty().MaximumLength(PostalCodeMaxLength);
        RuleFor(x => x.State).MaximumLength(StateMaxLength);
        RuleFor(x => x.Description).MaximumLength(DescriptionMaxLength);

        // Parsed with the SAME helper the domain validates and Property.SetLocation parses
        // with, so a value that passes here cannot be dropped later as unparseable. The old
        // check used the ambient culture and accepted "51,5310" as fifty-one thousand — which
        // then failed the invariant-culture parse, and the listing was saved with NO
        // coordinates, no error, and no pin on the map.
        RuleFor(x => x.X)
            .NotEmpty().MaximumLength(CoordinateMaxLength)
            .Must(v => Location.TryParseCoordinate(v, -180, 180, out _))
            .WithMessage("X (longitude) must be a number between -180 and 180, using '.' as the decimal separator.");

        RuleFor(x => x.Y)
            .NotEmpty().MaximumLength(CoordinateMaxLength)
            .Must(v => Location.TryParseCoordinate(v, -90, 90, out _))
            .WithMessage("Y (latitude) must be a number between -90 and 90, using '.' as the decimal separator.");
    }
}
