namespace RealEstate.Api.Requests;

// PUT body — the id comes from the route, everything else from here.
public sealed record UpdateAgentRequest(
    string Name,
    string JobTitle,
    string PhotoUrl,
    string? Slug,
    string? Phone,
    string? WhatsApp,
    string? Email,
    decimal Rating,
    string? Bio);
