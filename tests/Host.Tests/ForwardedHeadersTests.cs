using System.Net;
using global::Host.Startup;   // `Host` is also a type in Microsoft.Extensions.Hosting
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Host.Tests;

/// <summary>
/// WHO THE VISITOR IS.
///
/// Both public rate limiters were site-wide rather than per-visitor from the day Caddy was
/// put in front for HTTPS, and nothing said so. ForwardLimit defaults to 1, the middleware
/// reads X-Forwarded-For from the right, and the new chain put Caddy's address in that
/// rightmost slot — so HttpContext.Connection.RemoteIpAddress became the same value for
/// every visitor on earth. Thirty writes per five minutes for the entire internet, shared
/// with the view counter, after which every contact form on the site answered 429: a form
/// that failed for no reason the visitor could act on, and a quiet day at this end.
///
/// Nothing about that throws or logs. The only way to know is to run the real middleware
/// against the real configuration and look at the answer, which is what these do.
/// </summary>
public class ForwardedHeadersTests
{
    private const string Visitor = "203.0.113.9";    // a real person, out on the internet
    private const string Caddy = "172.18.0.5";       // the TLS edge, inside the docker network
    private const string Nginx = "172.18.0.6";       // what Kestrel sees as the peer

    /// <summary>
    /// Runs ForwardedHeadersMiddleware over one request and reports who it decided the
    /// caller was. `configure` defaults to the application's OWN settings.
    /// </summary>
    private static async Task<string?> ResolveClient(
        string forwardedFor,
        Action<ForwardedHeadersOptions>? configure = null)
    {
        var options = new ForwardedHeadersOptions();
        (configure ?? ProxyHeadersStartupExtensions.ConfigureForwardedHeaders)(options);

        var middleware = new ForwardedHeadersMiddleware(
            next: _ => Task.CompletedTask,
            loggerFactory: NullLoggerFactory.Instance,
            options: Options.Create(options));

        var context = new DefaultHttpContext();
        // The peer Kestrel actually has a socket to is always the proxy, never the visitor.
        context.Connection.RemoteIpAddress = IPAddress.Parse(Nginx);
        context.Request.Headers["X-Forwarded-For"] = forwardedFor;

        await middleware.Invoke(context);
        return context.Connection.RemoteIpAddress?.ToString();
    }

    // -----------------------------------------------------------------------------------
    // The live chain: internet -> caddy -> nginx -> kestrel.
    // nginx appends with $proxy_add_x_forwarded_for, so the header reads "visitor, caddy".
    // -----------------------------------------------------------------------------------
    [Fact]
    public async Task Behind_caddy_and_nginx_the_visitor_is_the_visitor()
    {
        Assert.Equal(Visitor, await ResolveClient($"{Visitor}, {Caddy}"));
    }

    /// <summary>
    /// The bug itself, pinned. If this ever stops failing to find the visitor, the default
    /// has changed meaning and the comment in ProxyHeadersStartupExtensions is wrong.
    /// </summary>
    [Fact]
    public async Task At_the_default_limit_every_visitor_is_caddy()
    {
        var resolved = await ResolveClient($"{Visitor}, {Caddy}", options =>
        {
            ProxyHeadersStartupExtensions.ConfigureForwardedHeaders(options);
            options.ForwardLimit = 1;             // the framework default
        });

        Assert.Equal(Caddy, resolved);
        Assert.NotEqual(Visitor, resolved);
    }

    /// <summary>
    /// Two visitors must not collapse into one key, which is the whole reason this matters:
    /// the rate limiters partition on exactly this value.
    /// </summary>
    [Fact]
    public async Task Two_visitors_resolve_to_two_different_addresses()
    {
        var first = await ResolveClient($"203.0.113.9, {Caddy}");
        var second = await ResolveClient($"198.51.100.4, {Caddy}");

        Assert.NotEqual(first, second);
        Assert.Equal("203.0.113.9", first);
        Assert.Equal("198.51.100.4", second);
    }

    /// <summary>
    /// A visitor can put anything in the header themselves. Caddy appends their real address
    /// after it and nginx appends Caddy's, so a forged entry is always further left than the
    /// two that get read — it must never be reachable. This is why the limit is a ceiling as
    /// well as a floor: at 3 a visitor could claim any identity, and with it anyone's quota.
    /// </summary>
    [Fact]
    public async Task A_forged_entry_further_left_cannot_be_reached()
    {
        Assert.Equal(Visitor, await ResolveClient($"9.9.9.9, {Visitor}, {Caddy}"));
    }

    [Fact]
    public async Task Raising_the_limit_would_let_a_visitor_forge_their_identity()
    {
        var resolved = await ResolveClient($"9.9.9.9, {Visitor}, {Caddy}", options =>
        {
            ProxyHeadersStartupExtensions.ConfigureForwardedHeaders(options);
            options.ForwardLimit = 3;
        });

        Assert.Equal("9.9.9.9", resolved);
    }

    /// <summary>
    /// The other deployment mode — the tls profile off, nginx published directly, no Caddy.
    /// The header is one entry long; the middleware runs out and the answer is still right.
    /// One value, both modes, no .env switch.
    /// </summary>
    [Fact]
    public async Task Without_caddy_in_front_the_answer_is_still_the_visitor()
    {
        Assert.Equal(Visitor, await ResolveClient(Visitor));
    }

    /// <summary>
    /// No header at all — a request that reached Kestrel without passing a proxy. The peer
    /// stands, rather than the middleware inventing an address.
    /// </summary>
    [Fact]
    public async Task With_no_forwarded_header_the_peer_stands()
    {
        Assert.Equal(Nginx, await ResolveClient(string.Empty));
    }

    /// <summary>
    /// The number is the point of the whole file, so it is asserted rather than assumed:
    /// a change to it has to come with a change here.
    /// </summary>
    [Fact]
    public void The_configured_hop_count_is_two()
    {
        var options = new ForwardedHeadersOptions();
        ProxyHeadersStartupExtensions.ConfigureForwardedHeaders(options);

        Assert.Equal(2, options.ForwardLimit);
        Assert.Equal(ProxyHeadersStartupExtensions.ProxyHopsInFront, options.ForwardLimit);

        // Both lists empty is what tells the middleware to skip the "is this peer a proxy I
        // trust" check. With either one populated it would stop at the first address it did
        // not recognise and forward nothing at all — the same silent failure by a different
        // route, which is why it is pinned here too.
        Assert.Empty(options.KnownProxies);
        Assert.Empty(options.KnownIPNetworks);
    }

    [Fact]
    public void The_scheme_is_forwarded_too_so_links_are_built_as_https()
    {
        var options = new ForwardedHeadersOptions();
        ProxyHeadersStartupExtensions.ConfigureForwardedHeaders(options);

        Assert.True(options.ForwardedHeaders.HasFlag(ForwardedHeaders.XForwardedFor));
        Assert.True(options.ForwardedHeaders.HasFlag(ForwardedHeaders.XForwardedProto));
    }
}
