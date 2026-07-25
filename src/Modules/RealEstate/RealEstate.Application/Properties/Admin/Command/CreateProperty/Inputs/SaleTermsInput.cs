// Flat, primitive inputs — the API never touches domain value objects.
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;

public sealed record SaleTermsInput(MoneyInput Price, PaymentMethod PaymentMethod, InstallmentPlanInput? Installment);
