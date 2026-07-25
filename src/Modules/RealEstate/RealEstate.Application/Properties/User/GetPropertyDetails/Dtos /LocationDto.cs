namespace RealEstate.Application.Properties.User.GetPropertyDetails.Dtos;

public sealed record LocationDto(string Country, string City, string Street, string State, string PostalCode, string X, string Y, string? Description);
