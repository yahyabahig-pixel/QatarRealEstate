using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Domain.Entities;

// ---------------------------------------------------------------------------------------------
//  A photo stored IN the database (varbinary(max)) instead of cloud object storage.
//
//  Deliberate choice for this deployment's scale (tens of listings, a few hundred photos):
//  one backup covers everything, no cloud subscription, no orphaned-file cleanup. If the
//  platform ever outgrows this, the public URL shape (/api/media/images/{id}) stays the same
//  and only the storage behind the endpoint changes.
//
//  Images are IMMUTABLE: there is no Update — replacing a photo means uploading a new one
//  and pointing the property/agent at the new URL. That is what makes it safe for the API
//  to serve them with "Cache-Control: immutable" so every browser downloads a photo once.
// ---------------------------------------------------------------------------------------------

public class StoredImage : AuditableEntity
{
    public const long MaxSizeBytes = 10 * 1024 * 1024;   // 10 MB per photo

    public static readonly IReadOnlyList<string> AllowedContentTypes =
    [
        "image/jpeg", "image/png", "image/webp", "image/avif", "image/gif",
    ];

    public string FileName { get; private set; } = string.Empty;   // original name, for admin display
    public string ContentType { get; private set; } = string.Empty;
    public long SizeBytes { get; private set; }
    public byte[] Data { get; private set; } = [];

    private StoredImage() { }

    public static Result<StoredImage> Create(string fileName, string contentType, byte[] data)
    {
        if (string.IsNullOrWhiteSpace(fileName)) return StoredImageErrors.FileNameRequired;
        if (data is null || data.Length == 0) return StoredImageErrors.Empty;
        if (data.LongLength > MaxSizeBytes) return StoredImageErrors.TooLarge;

        var normalizedType = contentType?.Trim().ToLowerInvariant() ?? string.Empty;
        if (!AllowedContentTypes.Contains(normalizedType, StringComparer.Ordinal))
            return StoredImageErrors.ContentTypeNotAllowed;

        return new StoredImage
        {
            FileName = fileName.Trim(),
            ContentType = normalizedType,
            SizeBytes = data.LongLength,
            Data = data,
        };
    }
}
