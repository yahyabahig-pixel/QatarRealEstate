using FluentValidation;
namespace RealEstate.Application.Properties.User.Queries.SearchProperties;

public sealed class SearchPropertiesValidator : AbstractValidator<SearchPropertiesQuery>
{
    // A page number has to have an upper bound as well as a lower one. Without it,
    // ?page=2147483647 reached the query as-is and (page - 1) * pageSize overflowed to a
    // negative Skip, which SQL Server rejects — a 500 for what is plainly a bad request.
    // 100_000 pages of 100 is ten million listings: far past anything real, near enough to
    // zero risk of refusing a genuine request.
    private const int MaxPage = 100_000;

    public SearchPropertiesValidator()
    {
        RuleFor(x => x.Page).InclusiveBetween(1, MaxPage);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.Sort).IsInEnum();
        RuleFor(x => x.ListingKind).IsInEnum().When(x => x.ListingKind.HasValue);
        RuleFor(x => x.Q).MaximumLength(200);
        RuleFor(x => x.City).MaximumLength(100);
        RuleFor(x => x.Furnishing).MaximumLength(100);
        RuleFor(x => x.MinPrice).GreaterThanOrEqualTo(0).When(x => x.MinPrice.HasValue);
        RuleFor(x => x.MaxPrice).GreaterThanOrEqualTo(0).When(x => x.MaxPrice.HasValue);
        RuleFor(x => x.MinArea).GreaterThanOrEqualTo(0).When(x => x.MinArea.HasValue);
        RuleFor(x => x.MaxArea).GreaterThanOrEqualTo(0).When(x => x.MaxArea.HasValue);
        RuleFor(x => x.MinRooms).InclusiveBetween(0, 100).When(x => x.MinRooms.HasValue);
        RuleFor(x => x.MinBathrooms).InclusiveBetween(0, 100).When(x => x.MinBathrooms.HasValue);

        // One listing cannot carry hundreds of amenities, so a request asking for hundreds is
        // not a search — it is a way to make the server build an enormous query.
        RuleFor(x => x.FeatureIds!).Must(ids => ids.Length <= 30)
            .WithMessage("At most 30 features can be requested at once.")
            .When(x => x.FeatureIds is not null);

        When(x => x.MinPrice.HasValue && x.MaxPrice.HasValue, () =>
            RuleFor(x => x.MinPrice!.Value).LessThanOrEqualTo(x => x.MaxPrice!.Value)
                .WithMessage("MinPrice must be ≤ MaxPrice."));
        When(x => x.MinArea.HasValue && x.MaxArea.HasValue, () =>
            RuleFor(x => x.MinArea!.Value).LessThanOrEqualTo(x => x.MaxArea!.Value)
                .WithMessage("MinArea must be ≤ MaxArea."));
    }
}
