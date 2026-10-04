namespace RealEstate.Application.Properties.User.Queries.GetPropertyDetails.Dtos;

// The slice of Agent the public details page needs for the "Listed by" contact card.
// Phone/WhatsApp may be null -- the frontend hides the corresponding buttons instead of
// rendering broken links.
public sealed record PropertyAgentDto(
    Guid Id,
    string Name,
    string JobTitle,
    string PhotoUrl,
    string Slug,
    string? Phone,
    string? WhatsApp);
