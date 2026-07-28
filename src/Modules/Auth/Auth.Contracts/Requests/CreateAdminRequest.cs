namespace Auth.Contracts.Requests;

// NOTE what is NOT here: no role, no IsMainAdmin, no permissions.
// A created admin is always a regular admin; power comes only from a position
// assigned later by someone holding Admin.AssignPosition.
public sealed record CreateAdminRequest(
    string Email,
    string Password,
    string FullName,
    Guid? PositionId);
