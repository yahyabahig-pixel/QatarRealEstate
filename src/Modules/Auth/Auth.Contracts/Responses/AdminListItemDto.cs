namespace Auth.Contracts.Responses;

public sealed record AdminListItemDto(
    Guid Id,
    string Email,
    string FullName,
    bool IsMainAdmin,
    bool IsActive,
    string? PositionName,
    DateTimeOffset CreatedAtUtc);
