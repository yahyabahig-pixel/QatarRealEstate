using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Domain.Entities;

/// <summary>
/// category of property, e.g., Apartment, Villa, Office, etc. This is a DDD entity with validation and factory methods.
/// </summary>
public class PropertyType : AuditableEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;


    private PropertyType() { }

    public static Result<PropertyType> Create(string name, string description)
    {
        if (string.IsNullOrWhiteSpace(name))
            return PropertyTypeErrors.NameRequired;

        if (string.IsNullOrWhiteSpace(description))
            return PropertyTypeErrors.DescriptionRequired;

        return new PropertyType
        {
            Name = name.Trim(),
            Description = description.Trim()
        };
    }

    public Result<Updated> Update(string name, string description)
    {
        if (string.IsNullOrWhiteSpace(name))
            return PropertyTypeErrors.NameRequired;

        if (string.IsNullOrWhiteSpace(description))
            return PropertyTypeErrors.DescriptionRequired;

        Name = name.Trim();
        Description = description.Trim();

        return Result.Updated;
    }
}