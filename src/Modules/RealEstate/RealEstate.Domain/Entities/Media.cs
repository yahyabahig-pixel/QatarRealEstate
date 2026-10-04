using System.Data.Common;
using System.Drawing;
using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Domain.Entities;

public class Media : AuditableEntity
{
    public string Url { get; private set; } = null!;

    public string MediaType { get; private set; } = null!;

    public int Width { get; private set; }

    public int Height { get; private set; }

    public int Order { get; private set; }

    public bool IsPrimary { get; private set; }

    public Guid PropertyId { get; private set; }

    // for ORM / serialization
    private Media() { }

    // The parameterless constructor above leaves Id at Guid.Empty and lets EF fill it in on
    // insert. That is fine for the database and wrong for the domain: two freshly created
    // Media objects are then indistinguishable in memory, and Property.ReorderMedia
    // identifies photos BY ID. This mirrors how Property itself is built.
    //
    // Assigning the Id here is NOT free on the persistence side, whatever an earlier version
    // of this comment claimed. EF's default for a Guid key is ValueGeneratedOnAdd, and with
    // that default a key that is already set means "this row exists" — so new photos reaching
    // SaveChanges through the tracked Property were turned into UPDATEs against rows that had
    // never been inserted, and adding photos failed outright. MediaConfiguration now declares
    // ValueGeneratedNever(), which is what makes this constructor safe. The two belong
    // together: do not remove one without the other.
    private Media(Guid id) : base(id) { }

    // Factory that validates using domain errors (DDD style)
    public static Result<Media> Create(string url, string mediaType, int width, int height, int order, bool isPrimary, Guid propertyId = default)
    {
        if (string.IsNullOrWhiteSpace(url))
            return MediaErrors.UrlRequired;

        if (string.IsNullOrWhiteSpace(mediaType))
            return MediaErrors.MediaTypeRequired;

        if (width <= 0 || height <= 0)
            return MediaErrors.InvalidDimensions;

        if (order < 0)
            return MediaErrors.InvalidOrder;

        if (propertyId == default(Guid))
            return MediaErrors.InvalidPropertyId;

        var media = new Media(Guid.NewGuid())
        {
            Url = url.Trim(),
            MediaType = mediaType.Trim(),
            Width = width,
            Height = height,
            Order = order,
            IsPrimary = isPrimary,
            PropertyId = propertyId
        };

        return media;
    }

    /// <summary>
    /// Position in the gallery, set by the aggregate root when the admin reorders it.
    /// internal: Property.ReorderMedia is the only legitimate caller, because "first" and
    /// "primary" have to change together.
    /// </summary>
    internal void SetPosition(int order, bool isPrimary)
    {
        Order = order;
        IsPrimary = isPrimary;
    }

    public Result<Updated> Update(string url, string mediaType, int width, int height, int order, bool isPrimary, Guid propertyId = default)
    {
        if (string.IsNullOrWhiteSpace(url))
            return MediaErrors.UrlRequired;

        if (string.IsNullOrWhiteSpace(mediaType))
            return MediaErrors.MediaTypeRequired;

        if (width <= 0 || height <= 0)
            return MediaErrors.InvalidDimensions;

        if (order < 0)
            return MediaErrors.InvalidOrder;

        if (propertyId == default(Guid))
            return MediaErrors.InvalidPropertyId;

        Url = url.Trim();
        MediaType = mediaType.Trim();
        Width = width;
        Height = height;
        Order = order;
        IsPrimary = isPrimary;
        PropertyId = propertyId;

        return Result.Updated;
    }
}