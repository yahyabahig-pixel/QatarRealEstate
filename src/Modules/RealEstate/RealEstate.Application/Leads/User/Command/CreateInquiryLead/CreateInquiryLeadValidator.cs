using FluentValidation;

namespace RealEstate.Application.Leads.User.Command.CreateInquiryLead;

public sealed class CreateInquiryLeadValidator : AbstractValidator<CreateInquiryLeadCommand>
{
    public CreateInquiryLeadValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().Length(2, 150);
        RuleFor(x => x.Phone).NotEmpty().Length(5, 30);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);
        RuleFor(x => x.Message).MaximumLength(2000);
        RuleFor(x => x.Source).MaximumLength(100);
    }
}
