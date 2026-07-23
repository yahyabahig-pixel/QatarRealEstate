using System;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Enums;

namespace RealEstate.Domain.ValueObjects;
/// <summary>
/// InstallmentPlan is a value object representing payment schedule details.
/// It's immutable and compared by value (record) to follow DDD practices.
/// </summary>
public sealed record InstallmentPlan
{
    public Money DownPayment { get; init; } = default!;

    public int NumberOfInstallments { get; init; }

    public Money InstallmentAmount { get; init; } = default!;

    public Frequency Frequency { get; init; }

    // for ORM
    private InstallmentPlan() { }

    private InstallmentPlan(Money downPayment, int numberOfInstallments, Money installmentAmount, Frequency frequency)
    {
        DownPayment = downPayment;
        NumberOfInstallments = numberOfInstallments;
        InstallmentAmount = installmentAmount;
        Frequency = frequency;
    }

    public static Result<InstallmentPlan> Create(Money downPayment, int numberOfInstallments, Money installmentAmount, Frequency frequency)
    {
        if (downPayment is null)
            return InstallmentPlanErrors.DownPaymentRequired;

        if (installmentAmount is null)
            return InstallmentPlanErrors.InstallmentAmountRequired;

        if (numberOfInstallments <= 0)
            return InstallmentPlanErrors.NumberOfInstallmentsInvalid;

        if (installmentAmount.Amount < 0)
            return InstallmentPlanErrors.InstallmentAmountNegative;

        if (downPayment.Amount < 0)
            return InstallmentPlanErrors.DownPaymentNegative;

        if (!string.Equals(downPayment.Currency, installmentAmount.Currency, StringComparison.OrdinalIgnoreCase))
            return InstallmentPlanErrors.CurrencyMismatch;

        return new InstallmentPlan(downPayment, numberOfInstallments, installmentAmount, frequency);
    }
}
