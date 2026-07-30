using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.Common;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Domain.Entities;

// ---------------------------------------------------------------------------------------------
//  A curated neighbourhood in the site's area guide ("The Pearl", "West Bay", ...).
//
//  NOT the same thing as Property.Location: Location is the ADDRESS of one listing (country,
//  city, street, coordinates) and lives inside the Property aggregate as a value object.
//  Area is a CATALOG entity — a marketing/navigation concept with its own public page, photo
//  and intro text. A property points at exactly one catalog area via Property.AreaId, and
//  "properties in this area" is computed from that link, never typed by hand.
// ---------------------------------------------------------------------------------------------

public class Area : AuditableEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;      // public URL segment, unique
    public string PhotoUrl { get; private set; } = string.Empty;
    public string? Intro { get; private set; }                    // guide-page intro text

    private Area() { }

    public static Result<Area> Create(string name, string photoUrl, string? slug = null, string? intro = null)
    {
        if (string.IsNullOrWhiteSpace(name)) return AreaErrors.NameRequired;
        if (string.IsNullOrWhiteSpace(photoUrl)) return AreaErrors.PhotoRequired;

        var normalizedSlug = SlugHelper.Normalize(string.IsNullOrWhiteSpace(slug) ? name : slug);
        if (normalizedSlug.Length == 0) return AreaErrors.SlugRequired;

        return new Area
        {
            Name = name.Trim(),
            Slug = normalizedSlug,
            PhotoUrl = photoUrl.Trim(),
            Intro = string.IsNullOrWhiteSpace(intro) ? null : intro.Trim(),
        };
    }

    public Result<Updated> Update(string name, string photoUrl, string? slug, string? intro)
    {
        if (string.IsNullOrWhiteSpace(name)) return AreaErrors.NameRequired;
        if (string.IsNullOrWhiteSpace(photoUrl)) return AreaErrors.PhotoRequired;

        var normalizedSlug = SlugHelper.Normalize(string.IsNullOrWhiteSpace(slug) ? name : slug);
        if (normalizedSlug.Length == 0) return AreaErrors.SlugRequired;

        Name = name.Trim();
        Slug = normalizedSlug;
        PhotoUrl = photoUrl.Trim();
        Intro = string.IsNullOrWhiteSpace(intro) ? null : intro.Trim();
        return Result.Updated;
    }
}
