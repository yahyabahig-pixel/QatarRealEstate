using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.Common;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.ValueObjects;

namespace RealEstate.Domain.Entities;

// ---------------------------------------------------------------------------------------------
//  An off-plan project shown on the public "Developments" pages and managed from the admin
//  panel. Simple aggregate like Agent: no state machine, no publication workflow — a project
//  page is either in the catalog or it isn't. StartingPrice is a plain decimal in QAR (single
//  currency platform), deliberately NOT the Money value object: it's marketing copy for a
//  card ("from QAR 780,000"), not a transactable amount with payment terms.
//
//  Location is the SAME value object Property uses (Location VO, owned by the aggregate,
//  X = longitude / Y = latitude as strings) — one location model across the whole domain,
//  never a Development-specific copy. The old free-text AreaName is gone; human-readable
//  area labels are derived from Location (street/state + city) at the presentation layer.
// ---------------------------------------------------------------------------------------------

public class Development : AuditableEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;      // public URL segment, unique
    public Location Location { get; private set; } = null!;
    public int DeliveryYear { get; private set; }
    public string CoverImageUrl { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public int UnitsCount { get; private set; }
    public string? DeveloperName { get; private set; }            // "Pearl Waterfront Co."
    public decimal StartingPrice { get; private set; }            // QAR; 0 = "price on request"
    public string? PaymentPlan { get; private set; }              // "20/80 over 4 years"

    private Development() { }

    public static Result<Development> Create(
        string name,
        Location location,
        int deliveryYear,
        string coverImageUrl,
        string? slug = null,
        string? description = null,
        int unitsCount = 0,
        string? developerName = null,
        decimal startingPrice = 0m,
        string? paymentPlan = null)
    {
        var validated = Validate(name, location, deliveryYear, coverImageUrl, unitsCount, startingPrice);
        if (validated.IsError) return validated.TopError;

        var normalizedSlug = SlugHelper.Normalize(string.IsNullOrWhiteSpace(slug) ? name : slug);
        if (normalizedSlug.Length == 0) return DevelopmentErrors.SlugRequired;

        return new Development
        {
            Name = name.Trim(),
            Slug = normalizedSlug,
            Location = location,
            DeliveryYear = deliveryYear,
            CoverImageUrl = coverImageUrl.Trim(),
            Description = Clean(description),
            UnitsCount = unitsCount,
            DeveloperName = Clean(developerName),
            StartingPrice = startingPrice,
            PaymentPlan = Clean(paymentPlan),
        };
    }

    public Result<Updated> Update(
        string name,
        Location location,
        int deliveryYear,
        string coverImageUrl,
        string? slug,
        string? description,
        int unitsCount,
        string? developerName,
        decimal startingPrice,
        string? paymentPlan)
    {
        var validated = Validate(name, location, deliveryYear, coverImageUrl, unitsCount, startingPrice);
        if (validated.IsError) return validated.TopError;

        var normalizedSlug = SlugHelper.Normalize(string.IsNullOrWhiteSpace(slug) ? name : slug);
        if (normalizedSlug.Length == 0) return DevelopmentErrors.SlugRequired;

        Name = name.Trim();
        Slug = normalizedSlug;
        Location = location;
        DeliveryYear = deliveryYear;
        CoverImageUrl = coverImageUrl.Trim();
        Description = Clean(description);
        UnitsCount = unitsCount;
        DeveloperName = Clean(developerName);
        StartingPrice = startingPrice;
        PaymentPlan = Clean(paymentPlan);
        return Result.Updated;
    }

    private static Result<Updated> Validate(
        string name, Location location, int deliveryYear, string coverImageUrl,
        int unitsCount, decimal startingPrice)
    {
        if (string.IsNullOrWhiteSpace(name)) return DevelopmentErrors.NameRequired;
        if (location is null) return DevelopmentErrors.LocationRequired;
        if (string.IsNullOrWhiteSpace(coverImageUrl)) return DevelopmentErrors.CoverImageRequired;
        if (deliveryYear is < 2000 or > 2100) return DevelopmentErrors.DeliveryYearInvalid;
        if (unitsCount < 0) return DevelopmentErrors.UnitsCountInvalid;
        if (startingPrice < 0m) return DevelopmentErrors.StartingPriceInvalid;
        return Result.Updated;
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
