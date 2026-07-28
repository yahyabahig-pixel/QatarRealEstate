namespace RealEstate.Application.Jobs;

// One DTO for both sides. The public query only ever returns IsActive == true rows,
// so exposing the flag costs nothing and saves a second, near-identical type.
public sealed record JobDto(
    Guid Id,
    string Title,
    string Department,
    string EmploymentType,
    string Location,
    string Description,
    bool IsActive);
