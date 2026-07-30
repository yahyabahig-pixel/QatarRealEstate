namespace RealEstate.Api.Requests;

// PUT body — the id comes from the route, everything else from here.
public sealed record UpdateJobRequest(
    string Title,
    string Department,
    string EmploymentType,
    string Location,
    string Description);
