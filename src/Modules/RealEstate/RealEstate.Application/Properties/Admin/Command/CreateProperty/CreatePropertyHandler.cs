
using System.Runtime.CompilerServices;
using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Properties.Admin.Command.CreateProperty;
using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;
using RealEstate.Application.Properties.Admin.Policies;
using RealEstate.Domain.Entities;
using RealEstate.Domain.ValueObjects;

public sealed class CreatePropertyHandler : ICommandHandler<CreatePropertyCommand, Guid>
{
    private readonly IPropertyRepository _properties;
    private readonly IAreaRepository _areas;
    private readonly IAgentRepository _agents;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyAuthorizationPolicy _authorization;

    public CreatePropertyHandler(
           IPropertyRepository properties,
           IAreaRepository areas,
           IAgentRepository agents,
           IUnitOfWork unitOfWork,
           PropertyAuthorizationPolicy authorization)
    {
        _properties = properties;
        _areas = areas;
        _agents = agents;
        _unitOfWork = unitOfWork;
        _authorization = authorization;
    }

    public async Task<Result<Guid>> Handle(CreatePropertyCommand request, CancellationToken cancellationToken)
    {
        var canCreate = _authorization.CanCreate();
        if (canCreate.IsError) return canCreate.Errors;

        //check if property with same title already exists
        if (!await _properties.PropertyTypeExistsAsync(request.PropertyTypeId, cancellationToken))
        {
            return Error.NotFound("PropertyType.NotFound", "The specified property type does not exist.");
        }
        // Build value objects   each factory returns Result; short-circuit on first error.

        var location = Location.Create(
                   request.Location.Country, request.Location.City, request.Location.Street,
                   request.Location.PostalCode, request.Location.State,
                   request.Location.X, request.Location.Y, request.Location.Description);
        if (location.IsError) return location.TopError;

        SaleTerms? sale = null;
        if (request.Sale is not null)
        {
            var built = BuildSaleTerms(request.Sale);
            if (built.IsError) return built.TopError;
            sale = built.Value;
        }

        RentTerms? rent = null;
        if (request.Rent is not null)
        {
            var built = BuildRentTerms(request.Rent);
            if (built.IsError) return built.TopError;
            rent = built.Value;
        }
        PropertySpecs? specs = request.Specs is null
           ? null
           : new PropertySpecs
           {
               NumberOfRooms = request.Specs.NumberOfRooms,
               AreaInSquareMeters = request.Specs.AreaInSquareMeters,
               Bathrooms = request.Specs.Bathrooms
           };

        // The aggregate is the source of truth for validity.
        var property = Property.Create(
            id: Guid.NewGuid(),
            title: request.Title,
            description: request.Description,
            typeId: request.PropertyTypeId,
            location: location.Value,
            kind: request.ListingKind,
            sale: sale,
            rent: rent,
            specs: specs);
        if (property.IsError) return property.TopError;

        // Area is a CATALOG reference: when provided it must be one of the defined Areas.
        if (request.AreaId is { } areaId && areaId != Guid.Empty)
        {
            if (await _areas.GetByIdAsync(areaId, cancellationToken) is null)
                return RealEstate.Domain.DomainErros.AreaErrors.NotFound;

            var assigned = property.Value.AssignArea(areaId);
            if (assigned.IsError) return assigned.TopError;
        }

        // Agent is a CATALOG reference too: when provided it must be a real agent.
        if (request.AgentId is { } assignAgentId && assignAgentId != Guid.Empty)
        {
            if (await _agents.GetByIdAsync(assignAgentId, cancellationToken) is null)
                return RealEstate.Domain.DomainErros.AgentErrors.NotFound;

            var agentAssigned = property.Value.AssignAgent(assignAgentId);
            if (agentAssigned.IsError) return agentAssigned.TopError;
        }

        // Presentation flags, applied through the aggregate's own mutators rather than by
        // assigning the properties — the entity keeps its private setters and stays the
        // only thing that decides what a valid listing looks like.
        var offPlan = request.IsOffPlan ? property.Value.MarkOffPlan() : property.Value.ClearOffPlan();
        if (offPlan.IsError) return offPlan.TopError;

        var onRequest = request.PriceOnRequest
            ? property.Value.MarkPriceOnRequest()
            : property.Value.ClearPriceOnRequest();
        if (onRequest.IsError) return onRequest.TopError;

        await _properties.AddAsync(property.Value, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return property.Value.Id;

    }
    //builders 
    private static Result<Money> BuildMoney(MoneyInput input) => Money.Create(input.Amount, input.Currency);

    private static Result<SaleTerms> BuildSaleTerms(SaleTermsInput input)
    {
        var price = BuildMoney(input.Price);
        if (price.IsError) return price.TopError;

        InstallmentPlan? plan = null;
        if (input.Installment is not null)
        {
            var down = BuildMoney(input.Installment.DownPayment);
            if (down.IsError) return down.TopError;

            var amount = BuildMoney(input.Installment.InstallmentAmount);
            if (amount.IsError) return amount.TopError;

            var built = InstallmentPlan.Create(
                down.Value, input.Installment.NumberOfInstallments, amount.Value, input.Installment.Frequency);
            if (built.IsError) return built.TopError;
            plan = built.Value;
        }

        return SaleTerms.Create(price.Value, input.PaymentMethod, plan);
    }
    private static Result<RentTerms> BuildRentTerms(RentTermsInput input)
    {
        var price = BuildMoney(input.Price);
        if (price.IsError) return price.TopError;
        return RentTerms.Create(price.Value, input.ContractDurationMonths);
    }

}
