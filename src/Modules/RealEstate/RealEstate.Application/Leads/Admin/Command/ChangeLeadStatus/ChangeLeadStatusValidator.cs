using FluentValidation;

namespace RealEstate.Application.Leads.Admin.Command.ChangeLeadStatus;

public sealed class ChangeLeadStatusValidator : AbstractValidator<ChangeLeadStatusCommand>
{
    public ChangeLeadStatusValidator()
    {
        // Only members of the LeadStatus enum — an arbitrary integer is a 400, not a row.
        RuleFor(x => x.Status).IsInEnum();
    }
}
