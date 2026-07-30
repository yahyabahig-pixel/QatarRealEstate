using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Enums;
using System;

namespace RealEstate.Domain.Entities;

public class Feature : AuditableEntity
{
    public string Name { get; private set; } = string.Empty;   // "Parking", "Near Hospital"

    public FeatureValueType ValueType { get; private set; }     // Boolean / Text / Number

    public string? Icon { get; private set; }                  // icon key or URL for the UI
    public bool IsActive { get; private set; } = true;


    private Feature() { }

    public static Result<Feature> Create(string name, FeatureValueType valueType, string? icon = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            return FeatureErrors.NameRequired;

        return new Feature
        {
            Name = name.Trim(),
            ValueType = valueType,
            Icon = icon?.Trim(),
            IsActive = true
        };
    }

    public Result<Updated> Update(string name, FeatureValueType valueType, string? icon)
    {
        if (string.IsNullOrWhiteSpace(name))
            return FeatureErrors.NameRequired;

        Name = name.Trim();
        ValueType = valueType;
        Icon = icon?.Trim();
        return Result.Updated;
    }



    public Result<Updated> Deactivate() { IsActive = false; return Result.Updated; }
    public Result<Updated> Activate() { IsActive = true; return Result.Updated; }
}