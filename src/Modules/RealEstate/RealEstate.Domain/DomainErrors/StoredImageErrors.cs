using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class StoredImageErrors
{
    public static Error NotFound =>
        Error.NotFound("Image.NotFound", "The requested image was not found.");

    public static Error Empty =>
        Error.Validation("Image.Empty", "The uploaded file is empty.");

    public static Error TooLarge =>
        Error.Validation("Image.TooLarge",
            "The uploaded file exceeds the maximum allowed size of 10 MB.");

    public static Error ContentTypeNotAllowed =>
        Error.Validation("Image.ContentTypeNotAllowed",
            "Only JPEG, PNG, WebP, AVIF and GIF images are allowed.");

    public static Error FileNameRequired =>
        Error.Validation("Image.FileNameRequired", "A file name is required.");
}
