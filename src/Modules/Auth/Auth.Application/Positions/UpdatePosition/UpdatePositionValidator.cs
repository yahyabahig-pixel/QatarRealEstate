using Auth.Domain.Entities;
using FluentValidation;

namespace Auth.Application.Positions.UpdatePosition;

public sealed class UpdatePositionValidator : AbstractValidator<UpdatePositionCommand>
{
    public UpdatePositionValidator()
    {
        RuleFor(x => x.PositionId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(Position.MaxNameLength);
        RuleFor(x => x.Description).MaximumLength(Position.MaxDescriptionLength);
    }
}
