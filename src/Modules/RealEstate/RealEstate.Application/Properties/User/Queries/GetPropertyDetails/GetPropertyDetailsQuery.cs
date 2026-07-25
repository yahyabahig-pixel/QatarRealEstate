using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.User.Queries.GetPropertyDetails.Dtos;
namespace RealEstate.Application.Properties.User.Queries.GetPropertyDetails;

public sealed record GetPropertyDetailsQuery(Guid PropertyId) : IQuery<PropertyDetailsDto>;