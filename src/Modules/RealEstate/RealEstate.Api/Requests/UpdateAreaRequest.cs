namespace RealEstate.Api.Requests;

// PUT body — the id comes from the route, everything else from here.
public sealed record UpdateAreaRequest(
    string Name,
    string PhotoUrl,
    string? Slug,
    string? Intro);
