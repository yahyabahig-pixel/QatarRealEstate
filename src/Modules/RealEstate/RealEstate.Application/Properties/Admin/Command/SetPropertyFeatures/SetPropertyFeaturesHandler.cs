using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;
using RealEstate.Application.Properties.Admin.Command.featureSelection;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Properties.Admin.Command.SetPropertyFeatures;


public sealed class SetPropertyFeaturesHandler : ICommandHandler<SetPropertyFeaturesCommand, Updated>
{
    private readonly IPropertyRepository _properties;
    private readonly IFeatureRepository _features;   // catalog read
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyOwnershipPolicy _ownership;

    public SetPropertyFeaturesHandler(
        IPropertyRepository properties, IFeatureRepository features,
        IUnitOfWork unitOfWork, PropertyOwnershipPolicy ownership)
    {
        _properties = properties;
        _features = features;
        _unitOfWork = unitOfWork;
        _ownership = ownership;
    }

    public async Task<Result<Updated>> Handle(SetPropertyFeaturesCommand command, CancellationToken ct)
    {
        var property = await _properties.GetByIdWithFeaturesAsync(command.PropertyId, ct);
        if (property is null) return Error.NotFound("Property.NotFound", "Property was not found.");

        var canModify = _ownership.CanModify(property);
        if (canModify.IsError) return canModify.TopError;

        // An absent or empty list means "no amenities selected". That is a valid end state
        // (the admin unticked everything), so it clears the selection instead of failing.
        var selections = command.Features ?? Array.Empty<FeatureSelectionInput>();
        var selectedIds = selections.Select(f => f.FeatureId).ToList();

        // The same feature sent twice is a contradictory instruction. Answer it with a 400
        // that names the problem, rather than letting a database index decide at line 52.
        if (selectedIds.Distinct().Count() != selectedIds.Count)
            return Error.Validation("Feature.Duplicate", "The same feature was selected more than once.");

        // 1) Verify every selected feature exists and is active.
        if (selectedIds.Count > 0)
        {
            var catalog = await _features.GetActiveByIdsAsync(selectedIds, ct);   // returns the valid ones
            if (catalog.Count != selectedIds.Count)
                return Error.Validation("Feature.Invalid", "One or more selected features do not exist or are inactive.");
        }

        // 2) Build the link entities.
        var links = new List<PropertyFeature>(selectedIds.Count);

        foreach (var selection in selections)
        {
            var built = PropertyFeature.Create(selection.FeatureId, selection.Value);
            if (built.IsError) return built.TopError;
            links.Add(built.Value);
        }

        // 3) Replace the property's feature set wholesale. ReplaceFeatures -- not AddFeatures --
        //    is what makes this endpoint idempotent: re-submitting an unchanged selection keeps
        //    the existing rows instead of inserting copies of them.
        var result = property.ReplaceFeatures(links);
        if (result.IsError) return result.TopError;

        await _unitOfWork.SaveChangesAsync(ct);
        return Result.Updated;
    }
}
