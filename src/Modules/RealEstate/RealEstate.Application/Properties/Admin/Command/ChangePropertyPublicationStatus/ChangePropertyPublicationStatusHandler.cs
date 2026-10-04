using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Properties.Admin.ChangePropertyPublicationStatus;

public sealed class ChangePropertyPublicationStatusHandler
    : ICommandHandler<ChangePropertyPublicationStatusCommand, Updated>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyOwnershipPolicy _ownership;

    public ChangePropertyPublicationStatusHandler(
        IPropertyRepository properties, IUnitOfWork unitOfWork, PropertyOwnershipPolicy ownership)
    {
        _properties = properties;
        _unitOfWork = unitOfWork;
        _ownership = ownership;
    }

    public async Task<Result<Updated>> Handle(
        ChangePropertyPublicationStatusCommand request, CancellationToken cancellationToken)
    {
        var property = await _properties.GetByIdAsync(request.Id, cancellationToken);
        if (property is null) return Error.NotFound("Property.NotFound", "Property was not found.");

        var canModify = _ownership.CanModify(property);
        if (canModify.IsError) return canModify.TopError;

        // Read BEFORE the transition, or the trail records the new status as the old one.
        var oldStatus = property.Status;

        var transition = request.Action switch
        {
            PublicationAction.Publish => property.Publish(),
            PublicationAction.Unpublish => property.Unpublish(),
            PublicationAction.MarkSold => property.MarkAsSold(),
            PublicationAction.MarkRented => property.MarkAsRented(),
            _ => Error.Validation("Property.InvalidAction", "Unsupported publication action.")
        };

        if (transition.IsError) return transition.TopError;

        // The audit trail. This is what the dashboard's "published / sold / rented / archived
        // per month" figures are computed from, and what GET {id}/history returns — both read
        // zero and empty while nothing wrote here. It is queued on the same unit of work as the
        // status change, so the two commit together or not at all.
        _properties.RecordStatusChange(
            PropertyStatusHistory.Record(property.Id, oldStatus, property.Status, request.Reason));

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
