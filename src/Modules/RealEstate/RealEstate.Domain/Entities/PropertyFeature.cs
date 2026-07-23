using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;
using System;

namespace RealEstate.Domain.Entities;

public class PropertyFeature : AuditableEntity
{
    public int PropertyId { get; private set; }

    public int FeatureId { get; private set; }

    public string FeatureName { get; private set; } = string.Empty;

    public string FeatureValue { get; private set; } = string.Empty;

    public string? Icon { get; private set; }

    private PropertyFeature() { }

    public static Result<PropertyFeature> Create(int propertyId, int featureId, string featureName, string featureValue, string? icon = null)
    {
        if (propertyId <= 0)
            return PropertyFeatureErrors.PropertyIdInvalid;

        if (featureId <= 0)
            return PropertyFeatureErrors.FeatureIdInvalid;

        if (string.IsNullOrWhiteSpace(featureName))
            return PropertyFeatureErrors.FeatureNameRequired;

        if (string.IsNullOrWhiteSpace(featureValue))
            return PropertyFeatureErrors.FeatureValueRequired;

        var pf = new PropertyFeature
        {
            PropertyId = propertyId,
            FeatureId = featureId,
            FeatureName = featureName.Trim(),
            FeatureValue = featureValue.Trim(),
            Icon = icon?.Trim()
        };

        return pf;
    }
}