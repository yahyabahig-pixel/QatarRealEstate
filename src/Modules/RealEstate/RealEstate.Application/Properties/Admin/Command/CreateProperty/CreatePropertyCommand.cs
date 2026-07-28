using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.Admin.Command.CreateProperty;

public sealed record CreatePropertyCommand(
    string Title,
    string Description,
    Guid PropertyTypeId,
    ListingKind ListingKind,
    LocationInput Location,
    SaleTermsInput? Sale,
    RentTermsInput? Rent,
    PropertySpecsInput? Specs,
    Guid? AreaId = null,                      // optional: file the listing under a catalog Area
    Guid? AgentId = null) : ICommand<Guid>;   // optional: assign the consultant who represents it