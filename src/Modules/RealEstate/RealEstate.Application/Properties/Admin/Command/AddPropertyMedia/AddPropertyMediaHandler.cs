
using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;
using RealEstate.Application.Properties.Admin.Command.AddPropertyMedia;
using RealEstate.Domain.Entities;

public sealed class AddPropertyMediaHandler : ICommandHandler<AddPropertyMediaCommand, Updated>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyOwnershipPolicy _ownership;

    public AddPropertyMediaHandler(
        IPropertyRepository properties, IUnitOfWork unitOfWork, PropertyOwnershipPolicy ownership)
    {
        _properties = properties;
        _unitOfWork = unitOfWork;
        _ownership = ownership;
    }

    public async Task<Result<Updated>> Handle(AddPropertyMediaCommand request, CancellationToken cancellationToken)
    {
        var property = await _properties.GetByIdWithMediaAsync(request.PropertyId, cancellationToken);
        if (property is null) return Error.NotFound("Property.NotFound", "Property was not found.");

        var canModify = _ownership.CanModify(property);
        if (canModify.IsError) return canModify.TopError;

        // Build all Media VOs first (all-or-nothing).
        var media = new List<Media>(request.Items.Count);
        foreach (var item in request.Items)
        {
            // propertyId left default: EF sets the FK from the aggregate relationship.
            // (After the Section-5 fix, change Media.PropertyId to Guid and pass property.Id.)
            var created = Media.Create(item.Url, item.MediaType, item.Width, item.Height, item.Order, item.IsPrimary);
            if (created.IsError) return created.TopError;
            media.Add(created.Value);
        }

        // Aggregate enforces max count + single-primary rule.
        var added = property.AddMedia(media);
        if (added.IsError) return added.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}