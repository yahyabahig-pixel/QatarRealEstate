using FluentValidation;
using RealEstate.Application.Common;
using RealEstate.Application.Properties.Admin.Command.UpdateProperty;
using RealEstate.Domain.Constants;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.Admin.UpdateProperty;

// Deliberately the SAME rule set as CreatePropertyValidator. They used to differ — Update
// checked only that terms were present — so a payload the create endpoint rejected was
// accepted by the update endpoint, and the difference showed up as a 500 from SQL Server.
public sealed class UpdatePropertyValidator : AbstractValidator<UpdatePropertyCommand>
{
    public UpdatePropertyValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
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
            RuleFor(x => x.Specs!.NumberOfRooms).InclusiveBetween(0, 1000);
            RuleFor(x => x.Specs!.Bathrooms).InclusiveBetween(0, 1000);
            RuleFor(x => x.Specs!.AreaInSquareMeters).InclusiveBetween(0m, 9_999_999_999m);
        });
    }
}
