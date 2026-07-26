using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;
using RealEstate.Application.Properties.Admin.ArchiveProperty;

public sealed class ArchivePropertyHandler : ICommandHandler<ArchivePropertyCommand, Updated>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyOwnershipPolicy _ownership;

    public ArchivePropertyHandler(
        IPropertyRepository properties, IUnitOfWork unitOfWork, PropertyOwnershipPolicy ownership)
    {
        _properties = properties;
        _unitOfWork = unitOfWork;
        _ownership = ownership;
    }
    public async Task<Result<Updated>> Handle(ArchivePropertyCommand request, CancellationToken cancellationToken)
    {
        var property = await _properties.GetByIdAsync(request.Id, cancellationToken);
        if (property is null) return Error.NotFound("Property.NotFound", "Property was not found.");
        var canModify = _ownership.CanModify(property);
        if (canModify.IsError) return canModify.TopError;

        var archived = property.Archive();
        if (archived.IsError) return archived.TopError;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;

    }

}