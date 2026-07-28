using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;

namespace RealEstate.Application.Properties.Admin.Command.SetPropertyFeatured;

public sealed class SetPropertyFeaturedHandler : ICommandHandler<SetPropertyFeaturedCommand, Updated>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyOwnershipPolicy _ownership;

    public SetPropertyFeaturedHandler(
        IPropertyRepository properties, IUnitOfWork unitOfWork, PropertyOwnershipPolicy ownership)
    {
        _properties = properties;
        _unitOfWork = unitOfWork;
        _ownership = ownership;
    }

    public async Task<Result<Updated>> Handle(SetPropertyFeaturedCommand request, CancellationToken cancellationToken)
    {
        var property = await _properties.GetByIdAsync(request.Id, cancellationToken);
        if (property is null) return Error.NotFound("Property.NotFound", "Property was not found.");

        var canModify = _ownership.CanModify(property);
        if (canModify.IsError) return canModify.TopError;

        // Domain enforces the rule: only a Published listing can be featured; unfeaturing
        // is always allowed.
        var result = request.IsFeatured ? property.Feature() : property.Unfeature();
        if (result.IsError) return result.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
