// Flat, primitive inputs — the API never touches domain value objects.
namespace RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;

public sealed record MoneyInput(decimal Amount, string Currency);
