using FluentValidation;

namespace RealEstate.Application.Features.Admin.Command.CreateFeature;

// Lengths match FeatureConfiguration (Name 100, Icon 500) so the API, not the database,
// is what rejects an oversized payload.
public sealed class CreateFeatureValidator : AbstractValidator<CreateFeatureCommand>
{
    public CreateFeatureValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ValueType).IsInEnum();
        RuleFor(x => x.Icon).MaximumLength(500);
    }
}
