namespace RealEstate.Application.Catalog;

// Reference data for dropdowns and filters. The search endpoint takes PropertyTypeId,
// so the frontend needs a way to turn "Apartment" into that id — this is it.
public sealed record PropertyTypeDto(Guid Id, string Name, string? Description);
