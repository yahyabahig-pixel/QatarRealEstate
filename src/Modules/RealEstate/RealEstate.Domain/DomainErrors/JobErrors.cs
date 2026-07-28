using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class JobErrors
{
    public static Error NotFound =>
        Error.NotFound("Job.NotFound", "The requested job opening was not found.");

    public static Error TitleRequired =>
        Error.Validation("Job.TitleRequired", "Job title is required.");

    public static Error DepartmentRequired =>
        Error.Validation("Job.DepartmentRequired", "Department is required.");

    public static Error EmploymentTypeRequired =>
        Error.Validation("Job.EmploymentTypeRequired", "Employment type is required (for example Full-time).");

    public static Error LocationRequired =>
        Error.Validation("Job.LocationRequired", "Job location is required.");

    public static Error DescriptionRequired =>
        Error.Validation("Job.DescriptionRequired", "Job description is required.");
}
