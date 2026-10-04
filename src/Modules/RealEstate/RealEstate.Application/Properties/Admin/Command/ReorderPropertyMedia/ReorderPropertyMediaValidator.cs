using FluentValidation;
using RealEstate.Domain.Constants;

namespace RealEstate.Application.Properties.Admin.Command.ReorderPropertyMedia;

public sealed class ReorderPropertyMediaValidator : AbstractValidator<ReorderPropertyMediaCommand>
{
    public ReorderPropertyMediaValidator()
    {
        RuleFor(x => x.PropertyId).NotEmpty();

        // Stop on the FIRST failure for this property. FluentValidation's default is
        // Continue, so with a body of {} the MediaIds rule chain carried on past NotEmpty()
        // into Must(ids => ids.Count …) and dereferenced null inside the validator — a 500
        // from the one component whose entire job is to turn bad input into a 400.
        RuleFor(x => x.MediaIds)
            .Cascade(CascadeMode.Stop)
            .NotNull()
            .NotEmpty()
            .Must(ids => ids.Count <= PropertyConstants.MaxMediaItems)
            .WithMessage($"A property cannot have more than {PropertyConstants.MaxMediaItems} media items.");
    }
}
