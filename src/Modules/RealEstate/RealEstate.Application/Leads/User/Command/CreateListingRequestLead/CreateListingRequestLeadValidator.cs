using FluentValidation;

namespace RealEstate.Application.Leads.User.Command.CreateListingRequestLead;

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

        RuleFor(x => x.Location).NotNull();
        When(x => x.Location is not null, () =>
        {
            RuleFor(x => x.Location.Country).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Location.City).NotEmpty().MaximumLength(100);
            RuleFor(x => x.Location.Street).NotEmpty().MaximumLength(200);
            RuleFor(x => x.Location.PostalCode).NotEmpty().MaximumLength(20);
            RuleFor(x => x.Location.X).NotEmpty()
                .Must(v => double.TryParse(v, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out _))
                .WithMessage("X coordinate (longitude) must be numeric.");
            RuleFor(x => x.Location.Y).NotEmpty()
                .Must(v => double.TryParse(v, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out _))
                .WithMessage("Y coordinate (latitude) must be numeric.");
        });
    }
}
