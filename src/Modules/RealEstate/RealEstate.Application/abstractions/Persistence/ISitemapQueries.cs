namespace RealEstate.Application.Abstractions.Persistence;

/// <summary>
/// The URL vocabulary the category landing pages are built from, in one place because two
/// layers need it: the controller lists the country-wide pages, and the query joins the same
/// slugs against the areas table for the per-district ones.
///
/// KEEP IN SYNC with CATEGORY_TYPES in frontend/src/pages/CategoryPages.jsx — the front end
/// owns which slug means which property type; this only needs to know the slugs exist.
/// A slug here the front end does not know redirects to the plain listings page, so a stale
/// entry is untidy rather than broken; a slug missing here means a real page goes
/// undiscovered, which is the worse direction to be wrong in.
/// </summary>
public static class SitemapPaths
{
    public static readonly string[] Purposes = ["rent", "buy"];

    public static readonly string[] CategorySlugs =
    [
        "apartments", "villas", "townhouses", "penthouses", "studios", "offices", "shops",
    ];
}

/// <summary>
/// One line of the sitemap: a path on the public site, and when the thing behind it last changed.
/// </summary>
/// <param name="Path">Site-relative, always starting with "/". The host is added when the XML is written.</param>
/// <param name="LastModifiedUtc">Fills &lt;lastmod&gt;. Null simply omits it, which is valid.</param>
public sealed record SitemapEntry(string Path, DateTimeOffset? LastModifiedUtc);

/// <summary>
/// The public pages that come from the database — every published property, and every area,
/// development and active agent.
///
/// Why this exists: the site is a single-page React app whose served HTML has an empty body, so a
/// crawler that does not run JavaScript sees no links at all and can discover nothing beyond the
/// home page. A sitemap states the pages outright instead of leaving them to be found.
/// </summary>
public interface ISitemapQueries
{
    Task<IReadOnlyList<SitemapEntry>> ListPublicPathsAsync(CancellationToken ct = default);
}
