using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.DependencyInjection;

namespace Host.Startup;

// ---------------------------------------------------------------------------------------
//  WHO THE VISITOR IS, once the request has been through the proxies in front.
//
//  Extracted from Program.cs so a test can exercise THIS configuration rather than a copy
//  of it. The value below is the kind of thing that is right until the day the deployment
//  changes shape, and the failure is silent: nothing throws, nothing logs, the site simply
//  starts treating every visitor on earth as the same person.
// ---------------------------------------------------------------------------------------

public static class ProxyHeadersStartupExtensions
{
    /// <summary>
    /// How many proxies stand between the internet and Kestrel, and therefore how many
    /// entries to take off the RIGHT of X-Forwarded-For.
    ///
    /// The chain is  internet -> caddy -> nginx -> kestrel , and nginx appends with
    /// $proxy_add_x_forwarded_for, so what arrives reads "&lt;the visitor&gt;, &lt;caddy&gt;".
    ///
    /// This is a ceiling as well as a floor. A visitor can put anything in that header
    /// themselves; Caddy appends their real address after it and nginx appends Caddy's, so
    /// a forged entry always sits further left than the two read here and can never be
    /// reached. Raising it would hand every visitor the ability to choose their own
    /// identity, and with it everyone else's rate limit.
    ///
    /// Without Caddy (plain HTTP, the tls profile off) the header is one entry long, the
    /// middleware runs out after the first and the answer is still the visitor — so this
    /// one value is correct in both deployment modes.
    /// </summary>
    public const int ProxyHopsInFront = 2;

    /// <summary>
    /// The real configuration, as a method, so the test and the app cannot drift apart.
    /// </summary>
    public static void ConfigureForwardedHeaders(ForwardedHeadersOptions options)
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = ProxyHopsInFront;

        // Cleared, not populated: the proxies' addresses inside a Docker network are not
        // known in advance. Emptying both lists is what tells the middleware to skip the
        // "is this peer a proxy I trust" check altogether — with either list non-empty it
        // would stop at the first address it did not recognise and forward nothing. Safe
        // here because the container ports are not published: nothing but the proxy in
        // front can open a connection to Kestrel at all.
        //
        // KnownIPNetworks, not the older KnownNetworks, which .NET now marks obsolete in
        // favour of it. ForwardedHeadersTests asserts the list really is empty afterwards,
        // so if the two ever stop being the same underlying set, that test says so rather
        // than the site quietly going back to seeing one visitor.
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
    }

    public static IServiceCollection AddProxyHeaders(this IServiceCollection services)
        => services.Configure<ForwardedHeadersOptions>(ConfigureForwardedHeaders);
}
