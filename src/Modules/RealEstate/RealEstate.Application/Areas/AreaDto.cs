namespace RealEstate.Application.Areas;

// PropertyCount is COMPUTED from Property.AreaId (published + active listings only) —
// never stored, never typed by hand, so it can't drift from reality.
public sealed record AreaDto(
    Guid Id,
    string Name,
    string Slug,
    string PhotoUrl,
    string? Intro,
    int PropertyCount);
