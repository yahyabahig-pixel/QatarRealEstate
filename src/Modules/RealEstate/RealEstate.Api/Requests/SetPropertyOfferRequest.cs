using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;

namespace RealEstate.Api.Requests;

public sealed record SetPropertyOfferRequest(MoneyInput? Offer);