using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;
namespace RealEstate.Application.Properties.Admin.Command.SetPropertyOffer;

public sealed record SetPropertyOfferCommand(Guid Id, MoneyInput? Offer) : ICommand<Updated>;