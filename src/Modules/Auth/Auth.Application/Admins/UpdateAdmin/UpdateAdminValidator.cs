using FluentValidation;

namespace Auth.Application.Admins.UpdateAdmin;

public sealed class UpdateAdminValidator : AbstractValidator<UpdateAdminCommand>
{
    public UpdateAdminValidator()
    {
        RuleFor(x => x.AdminId).NotEmpty();
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
    }
}
