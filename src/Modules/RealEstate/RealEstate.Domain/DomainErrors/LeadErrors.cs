using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class LeadErrors
{
    public static Error NotFound =>
        Error.NotFound("Lead.NotFound", "The requested lead was not found.");

    public static Error NameRequired =>
        Error.Validation("Lead.NameRequired", "Full name is required (2–150 characters).");

    public static Error PhoneRequired =>
        Error.Validation("Lead.PhoneRequired", "A phone number is required (5–30 characters).");

    public static Error EmailInvalid =>
        Error.Validation("Lead.EmailInvalid", "A valid email address is required.");

    public static Error PropertyNotFound =>
        Error.NotFound("Lead.PropertyNotFound", "The property this inquiry refers to was not found.");

    public static Error PropertyTypeRequired =>
        Error.Validation("Lead.PropertyTypeRequired", "The property type is required for a listing request.");

    public static Error LocationRequired =>
        Error.Validation("Lead.LocationRequired", "A location is required for a listing request.");
}
