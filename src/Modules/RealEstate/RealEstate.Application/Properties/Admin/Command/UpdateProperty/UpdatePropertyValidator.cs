
using FluentValidation;
using RealEstate.Application.Properties.Admin.Command.UpdateProperty;
using RealEstate.Domain.Constants;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.Admin.UpdateProperty;

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
        RuleFor(x => x.Location).NotNull();

        When(x => x.ListingKind == ListingKind.Sale, () => RuleFor(x => x.Sale).NotNull());
        When(x => x.ListingKind == ListingKind.Rent, () => RuleFor(x => x.Rent).NotNull());
    }
}