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
    Guid? AreaId = null) : ICommand<Updated>;    // optional: file the listing under a catalog Area