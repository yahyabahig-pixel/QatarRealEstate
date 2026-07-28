using FluentValidation;

namespace RealEstate.Application.Features.Admin.Command.UpdateFeature;

public sealed class UpdateFeatureValidator : AbstractValidator<UpdateFeatureCommand>
{
    public UpdateFeatureValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ValueType).IsInEnum();
        RuleFor(x => x.Icon).MaximumLength(500)
            .Must(RealEstate.Domain.Constants.FeatureIconCatalog.IsValid)
            .WithMessage("Icon must be a key from the curated real-estate icon catalog.");
    }
}
