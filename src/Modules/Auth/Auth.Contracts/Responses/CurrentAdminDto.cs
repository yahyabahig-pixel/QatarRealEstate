namespace Auth.Contracts.Responses;

// What GET /api/auth/me returns — the frontend builds its menus from this.
public sealed record CurrentAdminDto(
    Guid Id,
    string Email,
    string FullName,
    bool IsMainAdmin,
    string? PositionName,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);
