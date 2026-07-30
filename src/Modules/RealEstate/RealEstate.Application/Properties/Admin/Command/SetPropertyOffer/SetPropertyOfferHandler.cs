using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;
using RealEstate.Application.Properties.Admin.Command.SetPropertyOffer;
using RealEstate.Domain.ValueObjects;

namespace RealEstate.Application.Properties.Admin.Command.SetPropertyOffer;

public sealed class SetPropertyOfferHandler : ICommandHandler<SetPropertyOfferCommand, Updated>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyOwnershipPolicy _ownership;

    public SetPropertyOfferHandler(
        IPropertyRepository properties, IUnitOfWork unitOfWork, PropertyOwnershipPolicy ownership)
    {
        _properties = properties;
        _unitOfWork = unitOfWork;
        _ownership = ownership;
    }
    public async Task<Result<Updated>> Handle(SetPropertyOfferCommand request, CancellationToken cancellationToken)
    {
        var property = await _properties.GetByIdAsync(request.Id, cancellationToken);
        if (property is null) return Error.NotFound("Property.NotFound", "Property was not found.");

        var canModify = _ownership.CanModify(property);
        if (canModify.IsError) return canModify.TopError;

        Money? offer = null;
        if (request.Offer is not null)
        {
            var money = Money.Create(request.Offer.Amount, request.Offer.Currency);
            if (money.IsError) return money.TopError;
            offer = money.Value;
        }

        var result = property.SetOffer(offer);   // domain enforces "offer < base price", etc.
        if (result.IsError) return result.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}