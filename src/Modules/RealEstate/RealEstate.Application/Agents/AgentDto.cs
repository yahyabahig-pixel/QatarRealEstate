namespace RealEstate.Application.Agents;

// One DTO for both sides. The public queries only ever return IsActive == true rows,
// so exposing the flag costs nothing and saves a second, near-identical type.
public sealed record AgentDto(
    Guid Id,
    string Name,
    string JobTitle,
    string PhotoUrl,
    string Slug,
    string? Phone,
    string? WhatsApp,
    string? Email,
    decimal Rating,
    string? Bio,
    bool IsActive);
