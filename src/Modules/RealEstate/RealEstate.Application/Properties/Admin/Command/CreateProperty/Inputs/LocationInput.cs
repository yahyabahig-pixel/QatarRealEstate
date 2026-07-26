// Flat, primitive inputs — the API never touches domain value objects.
namespace RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;

public sealed record LocationInput(
    string Country, string City, string Street, string PostalCode,
    string State, string X, string Y, string? Description);
