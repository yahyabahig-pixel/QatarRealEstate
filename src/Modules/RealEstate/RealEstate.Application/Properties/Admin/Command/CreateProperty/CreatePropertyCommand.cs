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
    Guid? AgentId = null,                     // optional: assign the consultant who represents it
    // Presentation flags the aggregate already models. Trailing and defaulted so every
    // existing caller (and any client still posting the old body) keeps working unchanged.
    // "Exclusive" is NOT here: it is IsFeatured, and it keeps its own endpoint because the
    // domain only allows a PUBLISHED listing to be featured.
    bool IsOffPlan = false,
    bool PriceOnRequest = false) : ICommand<Guid>;