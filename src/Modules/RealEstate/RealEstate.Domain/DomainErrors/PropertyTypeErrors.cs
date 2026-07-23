using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class PropertyTypeErrors
{
    public static Error NameRequired =>
        Error.Validation("PropertyType.Name.Required", "Property type name is required.");

    public static Error DescriptionRequired =>
        Error.Validation("PropertyType.Description.Required", "Property type description is required.");
}