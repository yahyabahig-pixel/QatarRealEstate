using Auth.Domain.Entities;
using FluentValidation;

namespace Auth.Application.Positions.CreatePosition;

public sealed class CreatePositionValidator : AbstractValidator<CreatePositionCommand>
{
    public CreatePositionValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(Position.MaxNameLength);
        RuleFor(x => x.Description).MaximumLength(Position.MaxDescriptionLength);
    }
}
