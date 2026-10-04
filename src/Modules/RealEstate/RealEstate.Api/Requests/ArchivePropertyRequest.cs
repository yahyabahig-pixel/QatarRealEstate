namespace RealEstate.Api.Requests;

/// <summary>
/// Optional body for POST /api/admin/properties/{id}/archive.
///
/// Nullable and optional on purpose: the admin panel archives with no body today, and this
/// must not become a required field that breaks it. When a reason IS sent it is written to
/// the property's status history, which is where "why is this listing off the site?" gets
/// answered six months later.
/// </summary>
public sealed record ArchivePropertyRequest(string? Reason);
