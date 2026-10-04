// Properties/Admin/CreateProperty/CreatePropertyValidator.cs
using FluentValidation;
using RealEstate.Application.Common;
using RealEstate.Application.Properties.Admin.Command.CreateProperty;
using RealEstate.Domain.Constants;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.Admin.CreateProperty;

// SHAPE validation only. The aggregate still enforces the real invariants.
public sealed class CreatePropertyValidator : AbstractValidator<CreatePropertyCommand>
{
    public CreatePropertyValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty()
            .MinimumLength(PropertyConstants.MinTitleLength)
            .MaximumLength(PropertyConstants.MaxTitleLength);

        RuleFor(x => x.Description).MaximumLength(PropertyConstants.MaxDescriptionLength);
        RuleFor(x => x.PropertyTypeId).NotEmpty();
        RuleFor(x => x.ListingKind).IsInEnum();
        // Child validator, so a failure is reported as "Location.State" rather than losing
        // the field name. Column-accurate lengths and the domain's own coordinate parser.
        RuleFor(x => x.Location).NotNull().SetValidator(new LocationInputValidator());

        When(x => x.ListingKind == ListingKind.Sale, () =>
        {
            RuleFor(x => x.Sale).NotNull().WithMessage("Sale terms are required for a Sale listing.");
            // `Sale.Price` as well as `Sale`: a body of {"listingKind":"Sale","sale":{}} has a
            // non-null Sale with a null Price, and the rules below reach straight through it.
            // That was a 500 out of the validator, which is the one place that must not 500.
            RuleFor(x => x.Sale!.Price).NotNull().When(x => x.Sale is not null)
                .WithMessage("A sale price is required.");
            When(x => x.Sale is not null && x.Sale.Price is not null, () =>
            {
                RuleFor(x => x.Sale!.Price.Amount).GreaterThan(0);
                RuleFor(x => x.Sale!.Price.Currency)
                    .NotEmpty()
                    .Length(LocationInputValidator.CurrencyLength)
                    .WithMessage("Currency must be a 3-letter code, e.g. QAR.");
                RuleFor(x => x.Sale!.PaymentMethod).IsInEnum();
            });
        });

        When(x => x.ListingKind == ListingKind.Rent, () =>
        {
            RuleFor(x => x.Rent).NotNull().WithMessage("Rent terms are required for a Rent listing.");
            RuleFor(x => x.Rent!.Price).NotNull().When(x => x.Rent is not null)
                .WithMessage("A rent price is required.");
            When(x => x.Rent is not null && x.Rent.Price is not null, () =>
            {
                RuleFor(x => x.Rent!.Price.Amount).GreaterThan(0);
                RuleFor(x => x.Rent!.Price.Currency)
                    .NotEmpty()
                    .Length(LocationInputValidator.CurrencyLength)
                    .WithMessage("Currency must be a 3-letter code, e.g. QAR.");
                RuleFor(x => x.Rent!.ContractDurationMonths).InclusiveBetween(1, 600);
            });
        });

        When(x => x.Specs is not null, () =>
        {
            // Upper bounds as well as lower ones: Specs_Rooms is an int column, and a request
            // carrying int.MaxValue rooms is not a listing anyone is trying to create.
            RuleFor(x => x.Specs!.NumberOfRooms).InclusiveBetween(0, 1000);
            RuleFor(x => x.Specs!.Bathrooms).InclusiveBetween(0, 1000);
            // Specs_Area is decimal(12,2): anything larger overflows the column.
            RuleFor(x => x.Specs!.AreaInSquareMeters).InclusiveBetween(0m, 9_999_999_999m);
        });
    }
}
