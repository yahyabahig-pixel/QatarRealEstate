using FluentValidation;
using RealEstate.Application.Properties.Admin.Command.AddPropertyMedia;

namespace RealEstate.Application.Properties.Admin.AddPropertyMedia;

public sealed class AddPropertyMediaValidator : AbstractValidator<AddPropertyMediaCommand>
{
    public AddPropertyMediaValidator()
    {
        RuleFor(x => x.PropertyId).NotEmpty();
        RuleFor(x => x.Items).NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.Url).NotEmpty();
            item.RuleFor(i => i.MediaType).NotEmpty();
            item.RuleFor(i => i.Width).GreaterThan(0);
            item.RuleFor(i => i.Height).GreaterThan(0);
            item.RuleFor(i => i.Order).GreaterThanOrEqualTo(0);
        });
    }
}