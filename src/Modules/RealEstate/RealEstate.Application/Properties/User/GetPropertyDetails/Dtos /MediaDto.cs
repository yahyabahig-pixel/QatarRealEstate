namespace RealEstate.Application.Properties.User.GetPropertyDetails.Dtos;

public sealed record MediaDto(Guid Id, string Url, string MediaType, int Width, int Height, int Order, bool IsPrimary);
