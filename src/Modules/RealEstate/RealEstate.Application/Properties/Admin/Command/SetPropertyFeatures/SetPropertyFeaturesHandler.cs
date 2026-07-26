using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;
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
        // 1) Verify every selected feature exists
        var selectedIds = command.Features.Select(f => f.FeatureId).ToList();
        var catalog = await _features.GetActiveByIdsAsync(selectedIds, ct);   // returns the valid ones
        if (catalog.Count != selectedIds.Distinct().Count())
            return Error.Validation("Feature.Invalid", "One or more selected features do not exist or are inactive.");

        // 2) Build the link entities 
        var links = new List<PropertyFeature>(command.Features.Count);

        foreach (var selection in command.Features)
        {
            var built = PropertyFeature.Create(selection.FeatureId, selection.Value);
            if (built.IsError) return built.TopError;
            links.Add(built.Value);
        }
        // 3) Replace the property's feature set (aggregate enforces "no duplicates").
        var result = property.AddFeatures(links);
        if (result.IsError) return result.TopError;
        await _unitOfWork.SaveChangesAsync(ct);
        return Result.Updated;
    }
}
