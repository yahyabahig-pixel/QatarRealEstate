
using FluentValidation;
namespace RealEstate.Application.Properties.User.SearchProperties;

public sealed class SearchPropertiesValidator : AbstractValidator<SearchPropertiesQuery>
{
    public SearchPropertiesValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.Sort).IsInEnum();
        When(x => x.MinPrice.HasValue && x.MaxPrice.HasValue, () =>
            RuleFor(x => x.MinPrice!.Value).LessThanOrEqualTo(x => x.MaxPrice!.Value)
                .WithMessage("MinPrice must be ≤ MaxPrice."));
        When(x => x.MinArea.HasValue && x.MaxArea.HasValue, () =>
            RuleFor(x => x.MinArea!.Value).LessThanOrEqualTo(x => x.MaxArea!.Value)
                .WithMessage("MinArea must be ≤ MaxArea."));
    }
}