// Flat, primitive inputs — the API never touches domain value objects.
using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;

public sealed record InstallmentPlanInput(
    MoneyInput DownPayment, int NumberOfInstallments, MoneyInput InstallmentAmount, Frequency Frequency);
