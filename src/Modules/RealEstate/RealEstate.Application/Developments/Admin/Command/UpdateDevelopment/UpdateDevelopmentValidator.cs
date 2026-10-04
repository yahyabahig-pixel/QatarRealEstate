using FluentValidation;
using RealEstate.Application.Common;

namespace RealEstate.Application.Developments.Admin.Command.UpdateDevelopment;

public sealed class UpdateDevelopmentValidator : AbstractValidator<UpdateDevelopmentCommand>
{
    public UpdateDevelopmentValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        // Child validator, so a failure is reported as "Location.State" rather than losing
        // the field name. Column-accurate lengths and the domain's own coordinate parser.
        RuleFor(x => x.Location).NotNull().SetValidator(new LocationInputValidator());
        RuleFor(x => x.DeliveryYear).InclusiveBetween(2000, 2100);
        RuleFor(x => x.CoverImageUrl).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Slug).MaximumLength(200);
        RuleFor(x => x.Description).MaximumLength(4000);
        RuleFor(x => x.UnitsCount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DeveloperName).MaximumLength(200);
        RuleFor(x => x.StartingPrice).GreaterThanOrEqualTo(0m);
        RuleFor(x => x.PaymentPlan).MaximumLength(200);
    }
}
