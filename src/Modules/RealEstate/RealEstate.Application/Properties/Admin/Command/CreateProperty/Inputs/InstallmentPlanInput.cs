// Flat, primitive inputs — the API never touches domain value objects.
public sealed record InstallmentPlanInput(
    MoneyInput DownPayment, int NumberOfInstallments, MoneyInput InstallmentAmount, Frequency Frequency);
