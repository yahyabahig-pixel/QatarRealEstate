using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class InstallmentPlanErrors
{
    public static Error DownPaymentRequired =>
        Error.Validation("InstallmentPlan.DownPayment.Required", "Down payment is required.");

    public static Error InstallmentAmountRequired =>
        Error.Validation("InstallmentPlan.InstallmentAmount.Required", "Installment amount is required.");

    public static Error NumberOfInstallmentsInvalid =>
        Error.Validation("InstallmentPlan.NumberOfInstallments.Invalid", "Number of installments must be greater than zero.");

    public static Error InstallmentAmountNegative =>
        Error.Validation("InstallmentPlan.InstallmentAmount.Negative", "Installment amount cannot be negative.");

    public static Error DownPaymentNegative =>
        Error.Validation("InstallmentPlan.DownPayment.Negative", "Down payment cannot be negative.");

    public static Error CurrencyMismatch =>
        Error.Validation("InstallmentPlan.Currency.Mismatch", "Down payment and installment amount must use the same currency.");
}