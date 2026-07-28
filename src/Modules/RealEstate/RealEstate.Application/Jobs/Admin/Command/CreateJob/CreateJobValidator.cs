using FluentValidation;

namespace RealEstate.Application.Jobs.Admin.Command.CreateJob;

// Shape/length rules only. "Is it present at all" is the domain's job (JobErrors) — this
// layer exists so an oversized payload is rejected before it ever reaches the aggregate.
public sealed class CreateJobValidator : AbstractValidator<CreateJobCommand>
{
    public CreateJobValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Department).NotEmpty().MaximumLength(100);
        RuleFor(x => x.EmploymentType).NotEmpty().MaximumLength(60);
        RuleFor(x => x.Location).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(4000);
    }
}
