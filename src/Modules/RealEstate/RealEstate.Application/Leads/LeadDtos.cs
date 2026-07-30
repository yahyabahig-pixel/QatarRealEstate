using RealEstate.Domain.Enums;

namespace RealEstate.Application.Leads;

// Same location dialect the rest of the API speaks (X = longitude, Y = latitude, strings).
public sealed record LeadLocationDto(
    string Country, string City, string Street, string State, string X, string Y, string? Description);

// The catalog listing a PropertyInquiry points at — enough for the admin card + link.
public sealed record LeadPropertyDto(
    Guid Id, string Title, string City, ListingKind ListingKind,
    decimal? Price, string? Currency, string? CoverImageUrl, string? PropertyType);

public sealed record LeadAdminListItemDto(
    Guid Id,
    string FullName,
    string Phone,
    string Email,
    LeadType Type,
    LeadStatus Status,
    string Source,
    string? Message,
    Guid? PropertyId,
    string? PropertyTitle,
    string? PropertyTypeName,
    ListingKind? ListingKind,
    string? LocationCity,
    string? LocationStreet,
    DateTime CreatedOnUtc);

public sealed record LeadDetailsDto(
    Guid Id,
    string FullName,
    string Phone,
    string Email,
    LeadType Type,
    LeadStatus Status,
    string Source,
    string? Message,
    string? AgentName,
    LeadPropertyDto? Property,
    string? PropertyTypeName,
    ListingKind? ListingKind,
    LeadLocationDto? Location,
    DateTime CreatedOnUtc);
