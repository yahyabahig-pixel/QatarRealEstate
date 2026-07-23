using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;
using System.Runtime;

namespace RealEstate.Domain.ValueObjects;

public sealed record RentTerms
{
    public Guid Id { get; init; }
    public Money Price { get; init; } = default!;
    public int ContractDurationMonths { get; init; }

    private RentTerms() { }

    private RentTerms(Money price, int contractDurationMonths)
    {
        Price = price;
        ContractDurationMonths = contractDurationMonths;
    }

    public static Result<RentTerms> Create(Money price, int contractDurationMonths)
    {
        if (price is null)
            return RentTermsErrors.PriceRequired;

        if (price.Amount <= 0)
            return RentTermsErrors.PriceInvalid;

        if (contractDurationMonths <= 0)
            return RentTermsErrors.ContractDurationInvalid;

        return new RentTerms(price, contractDurationMonths);
    }
}