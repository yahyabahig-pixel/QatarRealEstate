using FluentValidation;
using RealEstate.Application.Common;

namespace RealEstate.Application.Leads.User.Command.CreateListingRequestLead;

// This is a PUBLIC form ("List your property with us"), so it is the most exposed validator in
// the application: whatever it does not bound, an anonymous visitor controls. State, the
// location description and both coordinates had no maximum length at all, and the columns
// behind them do — an over-long value passed here and was rejected by SQL Server instead,
// which the visitor saw as a 500.
public sealed class CreateListingRequestLeadValidator : AbstractValidator<CreateListingRequestLeadCommand>
{
    public CreateListingRequestLeadValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().Length(2, 150);
        RuleFor(x => x.Phone).NotEmpty().Length(5, 30);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Message).MaximumLength(2000);
        RuleFor(x => x.Source).MaximumLength(100);
        RuleFor(x => x.PropertyTypeName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ListingKind).IsInEnum();

        // Child validator, so a failure is reported as "Location.State" rather than losing
        // the field name. Column-accurate lengths and the domain's own coordinate parser.
        RuleFor(x => x.Location).NotNull().SetValidator(new LocationInputValidator());
    }
}
