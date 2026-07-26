using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;

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

        var transition = request.Action switch
        {
            PublicationAction.Publish => property.Publish(),
            PublicationAction.Unpublish => property.Unpublish(),
            PublicationAction.MarkSold => property.MarkAsSold(),
            PublicationAction.MarkRented => property.MarkAsRented(),
            _ => Error.Validation("Property.InvalidAction", "Unsupported publication action.")
        };

        if (transition.IsError) return transition.TopError;

        // A status-history/audit trail can be recorded here if needed.

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}