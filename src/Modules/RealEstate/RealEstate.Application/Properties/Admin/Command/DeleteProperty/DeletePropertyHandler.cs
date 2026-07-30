using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;

namespace RealEstate.Application.Properties.Admin.Command.DeleteProperty;

// PERMANENT removal, distinct from Archive (which hides the listing but keeps the row).
// Media, features and status history rows are deleted by the database cascade; Leads
// reference properties loosely (no FK), so past inquiries survive as sales history.
public sealed class DeletePropertyHandler : ICommandHandler<DeletePropertyCommand, Deleted>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyOwnershipPolicy _ownership;

    public DeletePropertyHandler(
        IPropertyRepository properties, IUnitOfWork unitOfWork, PropertyOwnershipPolicy ownership)
    {
        _properties = properties;
        _unitOfWork = unitOfWork;
        _ownership = ownership;
    }

    public async Task<Result<Deleted>> Handle(DeletePropertyCommand request, CancellationToken cancellationToken)
    {
        var property = await _properties.GetByIdAsync(request.Id, cancellationToken);
        if (property is null) return Error.NotFound("Property.NotFound", "Property was not found.");

        // Same ownership rule as every other mutation: an Agent-scoped admin may only
        // delete their own listings; full admins pass unconditionally.
        var canModify = _ownership.CanModify(property);
        if (canModify.IsError) return canModify.TopError;

        _properties.Remove(property);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Deleted;
    }
}
