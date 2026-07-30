using FluentValidation;

namespace Auth.Application.Admins.CreateAdmin;

public sealed class CreateAdminValidator : AbstractValidator<CreateAdminCommand>
{
    public CreateAdminValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
    }
}
