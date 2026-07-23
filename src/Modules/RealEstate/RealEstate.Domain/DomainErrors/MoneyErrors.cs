using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class MoneyErrors
{
    public static Error AmountInvalid =>
        Error.Validation("Money.Amount.Invalid", "Amount cannot be negative.");

    public static Error CurrencyRequired =>
        Error.Validation("Money.Currency.Required", "Currency is required.");
}