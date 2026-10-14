using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Enums;

namespace RealEstate.Infrastructure.Data.Queries;

public sealed class SitemapQueries : ISitemapQueries
{
    private readonly RealEstateDbContext _db;
    public SitemapQueries(RealEstateDbContext db) => _db = db;

    public async Task<IReadOnlyList<SitemapEntry>> ListPublicPathsAsync(CancellationToken ct = default)
    {
        var entries = new List<SitemapEntry>();

        // Properties. The visibility rule is the same two conditions PropertyQueries.PubliclyVisible()
        // uses -- Status AND IsActive. Filtering on Status alone would publish deactivated listings to
        // Google, and Property.IsAvailable cannot stand in for it: it is computed from Status and
        // deliberately not mapped to a column, so EF cannot translate it to SQL at all.
        var properties = await _db.Properties.AsNoTracking()
            .Where(p => p.Status == PropertyStatus.Published && p.IsActive)
            .Select(p => new { p.Id, p.ListingKind, p.LastModifiedUtc })
            .ToListAsync(ct);

        // The URL segment is the front end's word, not the enum's: ListingKind.Sale is "buy" in a URL.
        // frontend/src/api/realEstateApi.js maps it the same way for every link the site renders, so a
        // sitemap that emitted "sale" would advertise pages that no link on the site points to.
        entries.AddRange(properties.Select(p => new SitemapEntry(
            $"/property/{(p.ListingKind == ListingKind.Sale ? "buy" : "rent")}/{p.Id}",
            p.LastModifiedUtc)));

        // Areas and developments have no visibility flag -- every row is public.
        // Each of these selects into an anonymous type and builds the SitemapEntry afterwards, in
        // memory, rather than constructing the record inside the query. Projecting straight into a
        // record with a string concatenation and a nullable conversion is the kind of expression EF
        // may or may not translate depending on the provider and version, and when it cannot the
        // failure is a runtime exception on /sitemap.xml, not a build error. These are four small
        // tables; doing the shaping in memory costs nothing and cannot fail that way.
        var areas = await _db.Areas.AsNoTracking()
            .Select(a => new { a.Slug, a.LastModifiedUtc }).ToListAsync(ct);
        entries.AddRange(areas.Select(a => new SitemapEntry("/areas/" + a.Slug, a.LastModifiedUtc)));

        // Category pages narrowed to a district: /rent/shops/umm-salal and the rest. Built
        // from the areas table rather than a list in code, so adding an area in the admin
        // panel puts its pages in the sitemap on the next request with nothing to remember.
        //
        // These are the pages worth having. "shops for rent in Qatar" is contested by portals
        // with tens of thousands of listings; "shops for rent in Umm Salal" is a search this
        // company has both little competition for and the stock to answer.
        //
        // Every combination is listed, including ones with nothing in them today. A page with
        // no results is a thin page, and a crawler that meets enough of them visits less
        // often -- so this is worth revisiting if the area list grows much faster than the
        // listings do. At the present scale the risk of advertising an empty page is smaller
        // than the cost of a real one going undiscovered.
        entries.AddRange(
            from purpose in SitemapPaths.Purposes
            from slug in SitemapPaths.CategorySlugs
            from a in areas
            select new SitemapEntry($"/{purpose}/{slug}/{a.Slug}", null));

        var developments = await _db.Developments.AsNoTracking()
            .Select(d => new { d.Slug, d.LastModifiedUtc }).ToListAsync(ct);
        entries.AddRange(developments.Select(d => new SitemapEntry("/development/" + d.Slug, d.LastModifiedUtc)));

        // Agents do have one, and the public agent endpoints already honour it.
        var agents = await _db.Agents.AsNoTracking()
            .Where(a => a.IsActive)
            .Select(a => new { a.Slug, a.LastModifiedUtc }).ToListAsync(ct);
        entries.AddRange(agents.Select(a => new SitemapEntry("/find-agent/" + a.Slug, a.LastModifiedUtc)));

        return entries;
    }
}
