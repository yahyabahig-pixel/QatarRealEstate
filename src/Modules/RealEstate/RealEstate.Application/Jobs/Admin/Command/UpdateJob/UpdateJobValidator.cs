using FluentValidation;

namespace RealEstate.Application.Jobs.Admin.Command.UpdateJob;

// Same limits as CreateJobValidator — they must match the column widths in JobConfiguration,
// otherwise the database, not the API, is the thing that rejects an oversized payload.
public sealed class UpdateJobValidator : AbstractValidator<UpdateJobCommand>
{
    public UpdateJobValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Department).NotEmpty().MaximumLength(100);
        RuleFor(x => x.EmploymentType).NotEmpty().MaximumLength(60);
        RuleFor(x => x.Location).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(4000);
    }
}
