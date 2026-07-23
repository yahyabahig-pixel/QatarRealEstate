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

    public int PropertyId { get; private set; }

    // for ORM / serialization
    private Media() { }

    // Factory that validates using domain errors (DDD style)
    public static Result<Media> Create(string url, string mediaType, int width, int height, int order, bool isPrimary, int propertyId = 0)
    {
        if (string.IsNullOrWhiteSpace(url))
            return MediaErrors.UrlRequired;

        if (string.IsNullOrWhiteSpace(mediaType))
            return MediaErrors.MediaTypeRequired;

        if (width <= 0 || height <= 0)
            return MediaErrors.InvalidDimensions;

        if (order < 0)
            return MediaErrors.InvalidOrder;

        if (propertyId < 0)
            return MediaErrors.InvalidPropertyId;

        var media = new Media
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

    public Result<Updated> Update(string url, string mediaType, int width, int height, int order, bool isPrimary, int propertyId = 0)
    {
        if (string.IsNullOrWhiteSpace(url))
            return MediaErrors.UrlRequired;

        if (string.IsNullOrWhiteSpace(mediaType))
            return MediaErrors.MediaTypeRequired;

        if (width <= 0 || height <= 0)
            return MediaErrors.InvalidDimensions;

        if (order < 0)
            return MediaErrors.InvalidOrder;

        if (propertyId < 0)
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