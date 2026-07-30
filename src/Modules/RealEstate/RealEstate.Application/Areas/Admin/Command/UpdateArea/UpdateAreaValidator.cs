using FluentValidation;

namespace RealEstate.Application.Areas.Admin.Command.UpdateArea;

public sealed class UpdateAreaValidator : AbstractValidator<UpdateAreaCommand>
{
    public UpdateAreaValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.PhotoUrl).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.Slug).MaximumLength(200);
        RuleFor(x => x.Intro).MaximumLength(2000);
    }
}
