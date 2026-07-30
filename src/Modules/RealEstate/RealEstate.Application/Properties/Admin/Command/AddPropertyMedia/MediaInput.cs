namespace RealEstate.Application.Properties.Admin.Command.AddPropertyMedia;

public sealed record MediaInput(string Url, string MediaType, int Width, int Height, int Order, bool IsPrimary);
