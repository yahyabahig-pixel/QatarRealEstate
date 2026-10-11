using System.Xml.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Api.Controllers;

/// <summary>
/// GET /sitemap.xml — every public page, generated from the database on each request.
///
/// Generated rather than committed as a file because a static sitemap is wrong the moment a listing
/// is added or sold, and nobody remembers to regenerate it. nginx routes the bare /sitemap.xml path
/// here; robots.txt points at it.
/// </summary>
[ApiController]
[Route("sitemap.xml")]
public sealed class SitemapController : ControllerBase
{
    private static readonly XNamespace Ns = "http://www.sitemaps.org/schemas/sitemap/0.9";

    // The React router's own static routes, mirrored by hand from frontend/src/App.jsx.
    // Deliberately excluded: /admin and /admin/login (robots.txt disallows them), /favourites
    // (per-visitor, nothing for a crawler to index) and the "*" not-found route.
    private static readonly string[] StaticPaths =
    [
        "/", "/buy", "/rent", "/areas", "/developments", "/find-agent",
        "/off-market-opportunities", "/list-property", "/about-us", "/contact-us", "/careers",
    ];

    private readonly ISitemapQueries _queries;
    private readonly IConfiguration _config;

    public SitemapController(ISitemapQueries queries, IConfiguration config)
    {
        _queries = queries;
        _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var origin = ResolveOrigin();

        var urls = StaticPaths
            .Select(p => new SitemapEntry(p, null))
            .Concat(await _queries.ListPublicPathsAsync(ct))
            .Select(e => new XElement(Ns + "url",
                new XElement(Ns + "loc", origin + e.Path),
                e.LastModifiedUtc is { } at
                    ? new XElement(Ns + "lastmod", at.UtcDateTime.ToString("yyyy-MM-dd"))
                    : null));

        var doc = new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(Ns + "urlset", urls));

        // An hour is long enough to absorb a crawler hitting this repeatedly and short enough that a
        // listing published this morning is in the file by lunchtime.
        Response.Headers.CacheControl = "public, max-age=3600";
        return Content(doc.Declaration + Environment.NewLine + doc, "application/xml");
    }

    /// <summary>
    /// The absolute origin every &lt;loc&gt; is built on. Sitemap URLs must be absolute, and pointing
    /// them at the wrong host makes the whole file useless to a search engine.
    ///
    /// Preference order: the configured public origin, which is the one deliberate answer — then the
    /// request's own host, which is right because UseForwardedHeaders() runs first and restores the
    /// original scheme and host from the proxy, so this stays "https://..." behind Caddy rather than
    /// collapsing to the container's internal "http://".
    /// </summary>
    private string ResolveOrigin()
    {
        var configured = _config["Cors:AllowedOrigins:0"];

        if (!string.IsNullOrWhiteSpace(configured)
            && Uri.TryCreate(configured, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
        {
            return uri.GetLeftPart(UriPartial.Authority);
        }

        return $"{Request.Scheme}://{Request.Host}";
    }
}
