using FluentValidation;

namespace RealEstate.Application.Properties.Admin.ChangePropertyPublicationStatus;

public sealed class ChangePropertyPublicationStatusValidator
    : AbstractValidator<ChangePropertyPublicationStatusCommand>
{
    public ChangePropertyPublicationStatusValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Action).IsInEnum();
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}