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

    public string FileName { get; private set; } = string.Empty;
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

        // The content type above is what the BROWSER claimed, and the browser is the caller.
        // Anything at all can be uploaded as "image/png" — a script, an HTML page — and this
        // endpoint then serves those bytes back from our own origin under a type we assert.
        // Checking the file's own signature is what makes the claim true.
        if (!LooksLikeImage(data, normalizedType))
            return StoredImageErrors.ContentDoesNotMatchType;

        return new StoredImage
        {
            FileName = SafeFileName(fileName),
            ContentType = normalizedType,
            SizeBytes = data.LongLength,
            Data = data,
        };
    }

    /// <summary>
    /// Does the file BEGIN like the kind of image it says it is? Magic bytes, the first few
    /// of the file — enough to refuse a disguised upload, cheap enough to run on every one.
    /// </summary>
    public static bool LooksLikeImage(byte[] data, string contentType) => contentType switch
    {
        "image/jpeg" => StartsWith(data, [0xFF, 0xD8, 0xFF]),
        "image/png" => StartsWith(data, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        "image/gif" => StartsWith(data, "GIF87a"u8) || StartsWith(data, "GIF89a"u8),
        // RIFF....WEBP — the size field sits between the two markers.
        "image/webp" => StartsWith(data, "RIFF"u8) && HasAt(data, 8, "WEBP"u8),
        // ISO-BMFF: ....ftyp, then a brand. AVIF files carry "avif" or "avis".
        "image/avif" => HasAt(data, 4, "ftyp"u8) &&
                        (HasAt(data, 8, "avif"u8) || HasAt(data, 8, "avis"u8) || HasAt(data, 8, "mif1"u8)),
        _ => false,
    };

    private static bool StartsWith(byte[] data, ReadOnlySpan<byte> prefix) =>
        data.Length >= prefix.Length && data.AsSpan(0, prefix.Length).SequenceEqual(prefix);

    private static bool HasAt(byte[] data, int offset, ReadOnlySpan<byte> expected) =>
        data.Length >= offset + expected.Length &&
        data.AsSpan(offset, expected.Length).SequenceEqual(expected);

    /// <summary>
    /// The original name is shown to admins and echoed in a Content-Disposition header, so it
    /// keeps only its own last segment and no control characters: a name like
    /// "../../etc/passwd" or one carrying a newline is a header-injection trick, not a filename.
    /// </summary>
    private static string SafeFileName(string fileName)
    {
        var trimmed = fileName.Trim();
        var lastSlash = trimmed.LastIndexOfAny(['/', '\\']);
        if (lastSlash >= 0) trimmed = trimmed[(lastSlash + 1)..];

        var cleaned = new string(trimmed.Where(c => !char.IsControl(c)).ToArray()).Trim();
        if (cleaned.Length == 0) cleaned = "image";

        return cleaned.Length > 260 ? cleaned[..260] : cleaned;
    }
}
