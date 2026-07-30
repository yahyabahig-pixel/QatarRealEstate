using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Domain.Entities;

// ---------------------------------------------------------------------------------------------
//  A job opening shown on the public Careers page and managed from the admin panel.
//
//  DELIBERATELY SMALL. There is no application, no candidate, no CV upload and no pipeline:
//  the "Apply Now" button on the Careers page is a mailto: link, so the entire hiring workflow
//  lives in the recruiter's inbox. This aggregate stores the ADVERT and nothing else. If real
//  applications are ever wanted, that is a separate aggregate (JobApplication) with its own
//  storage and privacy rules — not extra columns bolted onto this one.
//
//  NO SLUG. Unlike Agent / Area / Development there is no public detail page for a job — the
//  Careers page renders every opening as a card inline — so there is no public URL segment to
//  normalize and no uniqueness rule to enforce. Two offices can legitimately advertise the
//  same title.
//
//  WHY Department AND EmploymentType ARE STRINGS, NOT ENUMS:
//  an enum would mean a code change, a rebuild and a deployment every time HR opens a role in
//  a department that doesn't exist yet, or invents a contract shape ("Contract", "Internship",
//  "Full-time (Hybrid)"). These are editorial labels the admin owns, not branching logic the
//  code reads — nothing in the domain ever does `if (department == ...)`. Same reasoning as
//  AppPermissions being string constants rather than table rows.
// ---------------------------------------------------------------------------------------------

public class Job : AuditableEntity
{
    public string Title { get; private set; } = string.Empty;
    public string Department { get; private set; } = string.Empty;   // "Sales", "Marketing", ...
    public string EmploymentType { get; private set; } = string.Empty; // "Full-time", "Part-time", ...
    public string Location { get; private set; } = string.Empty;     // "Doha, Qatar (Hybrid)"
    public string Description { get; private set; } = string.Empty;

    // false = the advert is closed. Kept rather than deleted so the admin can re-open a
    // recurring role next season without retyping it.
    public bool IsActive { get; private set; } = true;

    private Job() { }

    public static Result<Job> Create(
        string title,
        string department,
        string employmentType,
        string location,
        string description)
    {
        var validation = Validate(title, department, employmentType, location, description);
        if (validation.IsError) return validation.TopError;

        return new Job
        {
            Title = title.Trim(),
            Department = department.Trim(),
            EmploymentType = employmentType.Trim(),
            Location = location.Trim(),
            Description = description.Trim(),
            IsActive = true,
        };
    }

    public Result<Updated> Update(
        string title,
        string department,
        string employmentType,
        string location,
        string description)
    {
        var validation = Validate(title, department, employmentType, location, description);
        if (validation.IsError) return validation.TopError;

        Title = title.Trim();
        Department = department.Trim();
        EmploymentType = employmentType.Trim();
        Location = location.Trim();
        Description = description.Trim();
        return Result.Updated;
    }

    public Result<Updated> Activate() { IsActive = true; return Result.Updated; }
    public Result<Updated> Deactivate() { IsActive = false; return Result.Updated; }

    // One rule set, used by both Create and Update — they can never drift apart.
    private static Result<Updated> Validate(
        string title, string department, string employmentType, string location, string description)
    {
        if (string.IsNullOrWhiteSpace(title)) return JobErrors.TitleRequired;
        if (string.IsNullOrWhiteSpace(department)) return JobErrors.DepartmentRequired;
        if (string.IsNullOrWhiteSpace(employmentType)) return JobErrors.EmploymentTypeRequired;
        if (string.IsNullOrWhiteSpace(location)) return JobErrors.LocationRequired;
        if (string.IsNullOrWhiteSpace(description)) return JobErrors.DescriptionRequired;
        return Result.Updated;
    }
}
