using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;

namespace RealEstate.Application.Properties.Admin.Command.ReorderPropertyMedia;

public sealed class ReorderPropertyMediaHandler : ICommandHandler<ReorderPropertyMediaCommand, Updated>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyOwnershipPolicy _ownership;

    public ReorderPropertyMediaHandler(
        IPropertyRepository properties, IUnitOfWork unitOfWork, PropertyOwnershipPolicy ownership)
    {
        _properties = properties;
        _unitOfWork = unitOfWork;
        _ownership = ownership;
    }

    public async Task<Result<Updated>> Handle(
        ReorderPropertyMediaCommand request, CancellationToken cancellationToken)
    {
        var property = await _properties.GetByIdWithMediaAsync(request.PropertyId, cancellationToken);
        if (property is null) return Error.NotFound("Property.NotFound", "Property was not found.");

        var canModify = _ownership.CanModify(property);
        if (canModify.IsError) return canModify.TopError;

        var result = property.ReorderMedia(request.MediaIds);
        if (result.IsError) return result.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
