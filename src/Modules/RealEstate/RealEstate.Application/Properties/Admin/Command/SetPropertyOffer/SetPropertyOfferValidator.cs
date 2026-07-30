using FluentValidation;
using RealEstate.Application.Properties.Admin.Command.SetPropertyOffer;
namespace RealEstate.Application.Properties.Admin.Command.SetPropertyOffer;

public sealed class SetPropertyOfferValidator : AbstractValidator<SetPropertyOfferCommand>
{
    public SetPropertyOfferValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        When(x => x.Offer is not null, () =>
        {
            RuleFor(x => x.Offer!.Amount).GreaterThanOrEqualTo(0);
            RuleFor(x => x.Offer!.Currency).NotEmpty();
        });
    }
}