using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.Admin.Command.UpdateProperty;

public sealed record UpdatePropertyCommand(
    Guid Id,
    string Title,
    string Description,
    Guid PropertyTypeId,
    ListingKind ListingKind,
    LocationInput Location,
    SaleTermsInput? Sale,
    RentTermsInput? Rent,
    PropertySpecsInput? Specs,
    Guid? AreaId = null,                         // optional: file the listing under a catalog Area
    Guid? AgentId = null,                        // optional: assign the consultant who represents it
    // Same two presentation flags as CreatePropertyCommand — trailing and defaulted so the
    // existing positional construction in AdminPropertiesController keeps compiling.
    bool IsOffPlan = false,
    bool PriceOnRequest = false) : ICommand<Updated>;