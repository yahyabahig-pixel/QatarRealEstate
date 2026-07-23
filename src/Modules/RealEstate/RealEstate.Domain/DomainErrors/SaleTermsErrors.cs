using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class SaleTermsErrors
{
    public static Error PriceRequired =>
        Error.Validation("SaleTerms.Price.Required", "Sale price is required.");

    public static Error PriceInvalid =>
        Error.Validation("SaleTerms.Price.Invalid", "Sale price must be greater than 0.");

    public static Error PaymentMethodInvalid =>
        Error.Validation("SaleTerms.PaymentMethod.Invalid", "Invalid payment method.");

    public static Error InstallmentPlanRequired =>
        Error.Validation("SaleTerms.InstallmentPlan.Required", "Installment plan is required for installment payment method.");

    public static Error InstallmentPlanNotAllowed =>
        Error.Validation("SaleTerms.InstallmentPlan.NotAllowed", "Installment plan is not allowed for this payment method.");
}