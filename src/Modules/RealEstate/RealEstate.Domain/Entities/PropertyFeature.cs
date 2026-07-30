// The link between a Property and a catalog Feature. Lives INSIDE the Property aggregate.
using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Domain.Entities;
public sealed class PropertyFeature : AuditableEntity
{
    public Guid PropertyId { get; private set; }   // Guid now — matches Property.Id (fixes the old int bug)
    public Guid FeatureId { get; private set; }   // points at the catalog Feature
    public string? Value { get; private set; }   // null for Boolean features; "500" / "2" / "Marble" otherwise

    private PropertyFeature() { }

    // No name/icon here — those belong to the Feature catalog.
    public static Result<PropertyFeature> Create(Guid featureId, string? value = null)
    {
        if (featureId == Guid.Empty)
            return PropertyFeatureErrors.FeatureIdInvalid;

        return new PropertyFeature
        {
            FeatureId = featureId,
            Value = string.IsNullOrWhiteSpace(value) ? null : value.Trim()
        };
    }

    // Called by Property.ReplaceFeatures so a link that survives a re-selection keeps its
    // database row and only refreshes its value. internal: the aggregate root is the only
    // legitimate caller -- nothing outside RealEstate.Domain can mutate a link directly.
    internal void SetValue(string? value) =>
        Value = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
