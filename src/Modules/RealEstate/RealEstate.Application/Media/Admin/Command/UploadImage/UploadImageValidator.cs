using FluentValidation;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Media.Admin.Command.UploadImage;

public sealed class UploadImageValidator : AbstractValidator<UploadImageCommand>
{
    public UploadImageValidator()
    {
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(260);
        RuleFor(x => x.ContentType).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Content)
            .NotEmpty().WithMessage("The uploaded file is empty.")
            .Must(c => c is null || c.LongLength <= StoredImage.MaxSizeBytes)
            .WithMessage("The uploaded file exceeds the maximum allowed size of 10 MB.");
    }
}
