
using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;
using RealEstate.Application.Properties.Admin.RemovePropertyMedia;

namespace RealEstate.Application.Properties.Admin.RemovePropertyMedia;

public sealed class RemovePropertyMediaHandler : ICommandHandler<RemovePropertyMediaCommand, Updated>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyOwnershipPolicy _ownership;

    public RemovePropertyMediaHandler(
        IPropertyRepository properties, IUnitOfWork unitOfWork, PropertyOwnershipPolicy ownership)
    {
        _properties = properties;
        _unitOfWork = unitOfWork;
        _ownership = ownership;
    }

    public async Task<Result<Updated>> Handle(RemovePropertyMediaCommand request, CancellationToken cancellationToken)
    {
        var property = await _properties.GetByIdWithMediaAsync(request.PropertyId, cancellationToken);
        if (property is null) return Error.NotFound("Property.NotFound", "Property was not found.");

        var canModify = _ownership.CanModify(property);
        if (canModify.IsError) return canModify.TopError;

        var media = property.Media.FirstOrDefault(m => m.Id == request.MediaId);
        if (media is null) return Error.NotFound("Media.NotFound", "Media item was not found on this property.");

        var removed = property.RemoveMedia(media);
        if (removed.IsError) return removed.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}