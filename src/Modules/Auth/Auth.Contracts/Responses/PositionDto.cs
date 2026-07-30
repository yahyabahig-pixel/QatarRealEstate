namespace Auth.Contracts.Responses;

public sealed record PositionDto(
    Guid Id,
    string Name,
    string Description,
    bool IsActive,
    IReadOnlyList<string> Permissions,
    int AdminCount);
