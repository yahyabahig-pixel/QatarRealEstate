using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;
using RealEstate.Domain.Enums;

namespace RealEstate.Api.Requests;

public sealed record UpdatePropertyRequest(
    string Title,
    string Description,
    Guid PropertyTypeId,
    ListingKind ListingKind,
    LocationInput Location,
    SaleTermsInput? Sale,
    RentTermsInput? Rent,
    PropertySpecsInput? Specs,
    Guid? AreaId = null);
