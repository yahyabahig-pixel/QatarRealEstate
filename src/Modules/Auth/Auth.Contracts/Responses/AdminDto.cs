namespace Auth.Contracts.Responses;

public sealed record AdminDto(
    Guid Id,
    string Email,
    string FullName,
    bool IsMainAdmin,
    bool IsActive,
    Guid? PositionId,
    string? PositionName,
    IReadOnlyList<string> Permissions,
    DateTimeOffset CreatedAtUtc);
