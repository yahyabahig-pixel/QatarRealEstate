using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Enums;
using RealEstate.Domain.ValueObjects;

namespace RealEstate.Domain.ValueObjects;

public sealed record SaleTerms
{
    public Money Price { get; init; } = default!;
    public PaymentMethod PaymentMethod { get; init; }
    public InstallmentPlan? InstallmentPlan { get; init; }

    private SaleTerms() { }

    private SaleTerms(Money price, PaymentMethod paymentMethod, InstallmentPlan? installmentPlan)
    {
        Price = price;
        PaymentMethod = paymentMethod;
        InstallmentPlan = installmentPlan;
    }

    public static Result<SaleTerms> Create(Money price, PaymentMethod paymentMethod, InstallmentPlan? installmentPlan = null)
    {
        if (price is null)
            return SaleTermsErrors.PriceRequired;

        if (price.Amount <= 0)
            return SaleTermsErrors.PriceInvalid;

        if (!Enum.IsDefined(typeof(PaymentMethod), paymentMethod))
            return SaleTermsErrors.PaymentMethodInvalid;

        if (paymentMethod == PaymentMethod.Installment && installmentPlan is null)
            return SaleTermsErrors.InstallmentPlanRequired;

        if (paymentMethod != PaymentMethod.Installment && installmentPlan is not null)
            return SaleTermsErrors.InstallmentPlanNotAllowed;

        return new SaleTerms(price, paymentMethod, installmentPlan);
    }
}

