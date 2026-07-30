using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class AreaErrors
{
    public static Error NotFound =>
        Error.NotFound("Area.NotFound", "The requested area was not found.");

    public static Error NameRequired =>
        Error.Validation("Area.NameRequired", "Area name is required.");

    public static Error PhotoRequired =>
        Error.Validation("Area.PhotoRequired", "Area photo URL is required.");

    public static Error SlugRequired =>
        Error.Validation("Area.SlugRequired", "Area slug is required.");

    public static Error SlugTaken =>
        Error.Conflict("Area.SlugTaken", "Another area already uses this slug.");

    public static Error InUse =>
        Error.Conflict("Area.InUse",
            "This area cannot be deleted because properties are assigned to it. Reassign those properties first.");
}
