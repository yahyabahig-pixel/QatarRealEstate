using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.Common;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Domain.Entities;

// ---------------------------------------------------------------------------------------------
//  A sales agent shown on the public "Find an Agent" pages and managed from the admin panel.
//
//  Simple aggregate — no state machine. The only invariants are: the display fields that the
//  public site renders (name, job title, portrait) must exist, the rating stays within 0–5,
//  and the slug (the public URL segment, /find-agent/{slug}) is normalized here so the same
//  input always yields the same slug. Slug UNIQUENESS is enforced by the application handler
//  + a unique index — an entity cannot know about its siblings.
// ---------------------------------------------------------------------------------------------

public class Agent : AuditableEntity
{
    public string Name { get; private set; } = string.Empty;
    public string JobTitle { get; private set; } = string.Empty;
    public string PhotoUrl { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;      // public URL segment, unique

    public string? Phone { get; private set; }
    public string? WhatsApp { get; private set; }
    public string? Email { get; private set; }

    public decimal Rating { get; private set; }                   // 0 = "not rated yet"
    public string? Bio { get; private set; }

    public bool IsActive { get; private set; } = true;            // hidden from the public site when false

    private Agent() { }

    public static Result<Agent> Create(
        string name,
        string jobTitle,
        string photoUrl,
        string? slug = null,
        string? phone = null,
        string? whatsApp = null,
        string? email = null,
        decimal rating = 0m,
        string? bio = null)
    {
        if (string.IsNullOrWhiteSpace(name)) return AgentErrors.NameRequired;
        if (string.IsNullOrWhiteSpace(jobTitle)) return AgentErrors.JobTitleRequired;
        if (string.IsNullOrWhiteSpace(photoUrl)) return AgentErrors.PhotoUrlRequired;
        if (rating is < 0m or > 5m) return AgentErrors.RatingOutOfRange;

        // No slug supplied → derive it from the name ("Sara El-Amin" → "sara-el-amin").
        var normalizedSlug = NormalizeSlug(string.IsNullOrWhiteSpace(slug) ? name : slug);
        if (normalizedSlug.Length == 0) return AgentErrors.SlugRequired;

        return new Agent
        {
            Name = name.Trim(),
            JobTitle = jobTitle.Trim(),
            PhotoUrl = photoUrl.Trim(),
            Slug = normalizedSlug,
            Phone = Clean(phone),
            WhatsApp = Clean(whatsApp),
            Email = Clean(email),
            Rating = rating,
            Bio = Clean(bio),
            IsActive = true,
        };
    }

    public Result<Updated> Update(
        string name,
        string jobTitle,
        string photoUrl,
        string? slug,
        string? phone,
        string? whatsApp,
        string? email,
        decimal rating,
        string? bio)
    {
        if (string.IsNullOrWhiteSpace(name)) return AgentErrors.NameRequired;
        if (string.IsNullOrWhiteSpace(jobTitle)) return AgentErrors.JobTitleRequired;
        if (string.IsNullOrWhiteSpace(photoUrl)) return AgentErrors.PhotoUrlRequired;
        if (rating is < 0m or > 5m) return AgentErrors.RatingOutOfRange;

        var normalizedSlug = NormalizeSlug(string.IsNullOrWhiteSpace(slug) ? name : slug);
        if (normalizedSlug.Length == 0) return AgentErrors.SlugRequired;

        Name = name.Trim();
        JobTitle = jobTitle.Trim();
        PhotoUrl = photoUrl.Trim();
        Slug = normalizedSlug;
        Phone = Clean(phone);
        WhatsApp = Clean(whatsApp);
        Email = Clean(email);
        Rating = rating;
        Bio = Clean(bio);
        return Result.Updated;
    }

    public Result<Updated> Activate() { IsActive = true; return Result.Updated; }
    public Result<Updated> Deactivate() { IsActive = false; return Result.Updated; }

    /// <summary>Delegates to the shared slug algorithm (see SlugHelper) — one rule for
    /// every public-URL entity.</summary>
    public static string NormalizeSlug(string input) => SlugHelper.Normalize(input);

    private static string? Clean(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
