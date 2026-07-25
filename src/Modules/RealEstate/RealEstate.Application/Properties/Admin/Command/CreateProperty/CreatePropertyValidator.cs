// Properties/Admin/CreateProperty/CreatePropertyValidator.cs
using FluentValidation;
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
        RuleFor(x => x.Location).NotNull();

        When(x => x.Location is not null, () =>
        {
            RuleFor(x => x.Location.Country).NotEmpty();
            RuleFor(x => x.Location.City).NotEmpty();
            RuleFor(x => x.Location.Street).NotEmpty();
            RuleFor(x => x.Location.PostalCode).NotEmpty();
        });

        When(x => x.ListingKind == ListingKind.Sale, () =>
            RuleFor(x => x.Sale).NotNull().WithMessage("Sale terms are required for a Sale listing."));

        When(x => x.ListingKind == ListingKind.Rent, () =>
            RuleFor(x => x.Rent).NotNull().WithMessage("Rent terms are required for a Rent listing."));

        When(x => x.Specs is not null, () =>
        {
            RuleFor(x => x.Specs!.NumberOfRooms).GreaterThanOrEqualTo(0);
            RuleFor(x => x.Specs!.Bathrooms).GreaterThanOrEqualTo(0);
            RuleFor(x => x.Specs!.AreaInSquareMeters).GreaterThanOrEqualTo(0);
        });
    }
}