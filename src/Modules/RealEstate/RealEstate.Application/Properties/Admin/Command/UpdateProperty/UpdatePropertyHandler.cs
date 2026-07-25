// Properties/Admin/UpdateProperty/UpdatePropertyHandler.cs
using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.policies;
using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;
using RealEstate.Application.Properties.Admin.Command.UpdateProperty;
using RealEstate.Application.Properties.Admin.CreateProperty;
using RealEstate.Domain.ValueObjects;

namespace RealEstate.Application.Properties.Admin.UpdateProperty;

public sealed class UpdatePropertyHandler : ICommandHandler<UpdatePropertyCommand, Updated>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyOwnershipPolicy _ownership;

    public UpdatePropertyHandler(
        IPropertyRepository properties, IUnitOfWork unitOfWork, PropertyOwnershipPolicy ownership)
    {
        _properties = properties;
        _unitOfWork = unitOfWork;
        _ownership = ownership;
    }

    public async Task<Result<Updated>> Handle(UpdatePropertyCommand request, CancellationToken cancellationToken)
    {
        var property = await _properties.GetByIdAsync(request.Id, cancellationToken);
        if (property is null) return Error.NotFound("Property.NotFound", "Property was not found.");

        var canModify = _ownership.CanModify(property);
        if (canModify.IsError) return canModify.TopError;

        var location = Location.Create(
            request.Location.Country, request.Location.City, request.Location.Street,
            request.Location.PostalCode, request.Location.State,
            request.Location.X, request.Location.Y, request.Location.Description);
        if (location.IsError) return location.TopError;

        SaleTerms? sale = null;
        if (request.Sale is not null)
        {
            var built = BuildSale(request.Sale);
            if (built.IsError) return built.TopError;
            sale = built.Value;
        }

        RentTerms? rent = null;
        if (request.Rent is not null)
        {
            var built = BuildRent(request.Rent);
            if (built.IsError) return built.TopError;
            rent = built.Value;
        }

        var updated = property.Update(
            request.Title, request.Description, request.PropertyTypeId,
            location.Value, request.ListingKind, sale, rent);
        if (updated.IsError) return updated.TopError;

        // Property.Update ignores specs by design — apply them through the dedicated method.
        if (request.Specs is not null)
        {
            var specsResult = property.UpdatePropertySpecs(new PropertySpecs
            {
                NumberOfRooms = request.Specs.NumberOfRooms,
                AreaInSquareMeters = request.Specs.AreaInSquareMeters,
                Bathrooms = request.Specs.Bathrooms
            });
            if (specsResult.IsError) return specsResult.TopError;
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }

    private static Result<SaleTerms> BuildSale(SaleTermsInput input)
    {
        var price = Money.Create(input.Price.Amount, input.Price.Currency);
        if (price.IsError) return price.TopError;

        InstallmentPlan? plan = null;
        if (input.Installment is not null)
        {
            var down = Money.Create(input.Installment.DownPayment.Amount, input.Installment.DownPayment.Currency);
            if (down.IsError) return down.TopError;
            var amount = Money.Create(input.Installment.InstallmentAmount.Amount, input.Installment.InstallmentAmount.Currency);
            if (amount.IsError) return amount.TopError;
            var built = InstallmentPlan.Create(down.Value, input.Installment.NumberOfInstallments, amount.Value, input.Installment.Frequency);
            if (built.IsError) return built.TopError;
            plan = built.Value;
        }
        return SaleTerms.Create(price.Value, input.PaymentMethod, plan);
    }

    private static Result<RentTerms> BuildRent(RentTermsInput input)
    {
        var price = Money.Create(input.Price.Amount, input.Price.Currency);
        if (price.IsError) return price.TopError;
        return RentTerms.Create(price.Value, input.ContractDurationMonths);
    }
}