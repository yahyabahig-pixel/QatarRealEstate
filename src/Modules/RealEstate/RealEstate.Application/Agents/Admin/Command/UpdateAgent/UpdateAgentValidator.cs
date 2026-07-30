using FluentValidation;

namespace RealEstate.Application.Agents.Admin.Command.UpdateAgent;

public sealed class UpdateAgentValidator : AbstractValidator<UpdateAgentCommand>
{
    public UpdateAgentValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.JobTitle).NotEmpty().MaximumLength(200);
        RuleFor(x => x.PhotoUrl).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Slug).MaximumLength(200);
        RuleFor(x => x.Phone).MaximumLength(50);
        RuleFor(x => x.WhatsApp).MaximumLength(50);
        RuleFor(x => x.Email).MaximumLength(320).EmailAddress()
            .When(x => !string.IsNullOrWhiteSpace(x.Email));
        RuleFor(x => x.Rating).InclusiveBetween(0m, 5m);
        RuleFor(x => x.Bio).MaximumLength(2000);
    }
}
