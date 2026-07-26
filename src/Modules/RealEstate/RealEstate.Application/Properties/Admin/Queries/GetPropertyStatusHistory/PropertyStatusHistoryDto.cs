using RealEstate.Domain.Enums;
namespace RealEstate.Application.Properties.Admin.Queries.GetPropertyStatusHistory;

public sealed record PropertyStatusHistoryDto(
    Guid Id,
    Guid PropertyId,
    PropertyStatus? OldStatus,
    PropertyStatus NewStatus,
    string? Reason,
    Guid? ChangedBy,
    DateTime ChangedOnUtc);