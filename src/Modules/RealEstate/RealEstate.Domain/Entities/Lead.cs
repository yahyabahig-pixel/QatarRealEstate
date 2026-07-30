using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Enums;
using RealEstate.Domain.ValueObjects;

namespace RealEstate.Domain.Entities;

// ---------------------------------------------------------------------------------------------
//  A potential customer or potential seller. ONE aggregate, THREE shapes, enforced by the
//  factories rather than by table-per-type machinery:
//
//    PropertyInquiry  → PropertyId set (loose Guid reference — no FK into the catalog;
//                       a lead is sales history and must outlive anything that happens
//                       to the listing), Location/type fields null.
//    ListingRequest   → the owner's property description: PropertyTypeName + ListingKind +
//                       the SAME Location value object Properties and Developments use.
//    GeneralInquiry   → contact-page / agent-contact messages; neither group is set.
//
//  Status is admin-only by construction: no factory accepts one — every lead is born New,
//  and only SetStatus (reachable through admin commands alone) moves it.
// ---------------------------------------------------------------------------------------------
public class Lead : AuditableEntity
{
    public string FullName { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string? Message { get; private set; }
    public LeadType Type { get; private set; }
    public LeadStatus Status { get; private set; } = LeadStatus.New;
    public string Source { get; private set; } = string.Empty;    // display label ("Property inquiry", …)

    // PropertyInquiry / GeneralInquiry
    public Guid? PropertyId { get; private set; }
    public Guid? AgentId { get; private set; }

    // ListingRequest
    public string? PropertyTypeName { get; private set; }
    public ListingKind? ListingKind { get; private set; }
    public Location? Location { get; private set; }

    private Lead() { }

    public static Result<Lead> CreateInquiry(
        string fullName, string phone, string email, string? message,
        Guid? propertyId, Guid? agentId, string? source)
    {
        if (ValidateContact(fullName, phone, email) is { } error) return error;

        return new Lead
        {
            FullName = fullName.Trim(),
            Phone = phone.Trim(),
            Email = email.Trim(),
            Message = Clean(message),
            Type = propertyId.HasValue ? LeadType.PropertyInquiry : LeadType.GeneralInquiry,
            Status = LeadStatus.New,
            Source = Clean(source) ?? (propertyId.HasValue ? "Property inquiry" : "Website inquiry"),
            PropertyId = propertyId,
            AgentId = agentId,
        };
    }

    public static Result<Lead> CreateListingRequest(
        string fullName, string phone, string email, string? message,
        string propertyTypeName, ListingKind listingKind, Location location, string? source)
    {
        if (ValidateContact(fullName, phone, email) is { } error) return error;
        if (string.IsNullOrWhiteSpace(propertyTypeName)) return LeadErrors.PropertyTypeRequired;
        if (location is null) return LeadErrors.LocationRequired;

        return new Lead
        {
            FullName = fullName.Trim(),
            Phone = phone.Trim(),
            Email = email.Trim(),
            Message = Clean(message),
            Type = LeadType.ListingRequest,
            Status = LeadStatus.New,
            Source = Clean(source) ?? "List your property",
            PropertyTypeName = propertyTypeName.Trim(),
            ListingKind = listingKind,
            Location = location,
        };
    }

    public Result<Updated> SetStatus(LeadStatus status)
    {
        Status = status;
        return Result.Updated;
    }

    private static BuildingBlocks.Domain.Common.Results.Errors.Error? ValidateContact(
        string fullName, string phone, string email)
    {
        if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length is < 2 or > 150)
            return LeadErrors.NameRequired;

        if (string.IsNullOrWhiteSpace(phone) || phone.Trim().Length is < 5 or > 30)
            return LeadErrors.PhoneRequired;

        var mail = email?.Trim() ?? string.Empty;
        if (mail.Length is < 5 or > 200 || !mail.Contains('@') || mail.StartsWith('@') || mail.EndsWith('@'))
            return LeadErrors.EmailInvalid;

        return null;
    }

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
