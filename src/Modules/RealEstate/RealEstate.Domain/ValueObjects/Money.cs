using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Domain.ValueObjects;

public sealed record Money
{
    public decimal Amount { get; init; }
    public string Currency { get; init; } = null!;

    // for ORM / serialization
    private Money() { }

    private Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }

    public static Result<Money> Create(decimal amount, string currency)
    {
        if (amount < 0)
            return MoneyErrors.AmountInvalid;

        if (string.IsNullOrWhiteSpace(currency))
            return MoneyErrors.CurrencyRequired;

        var money = new Money(amount, currency.Trim().ToUpperInvariant());
        return money;
    }
}

