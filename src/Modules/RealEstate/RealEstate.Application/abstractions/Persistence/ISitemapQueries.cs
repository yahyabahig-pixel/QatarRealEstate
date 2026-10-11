namespace RealEstate.Application.Abstractions.Persistence;

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
