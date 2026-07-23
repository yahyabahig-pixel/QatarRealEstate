using System.Security.Cryptography.X509Certificates;
using BuildingBlocks.Domain.Common;
using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using RealEstate.Domain.Constants;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Enums;
using RealEstate.Domain.ValueObjects;

namespace RealEstate.Domain.Entities;

public sealed class Property : AuditableEntity
{
    private readonly List<Media> _media = new();
    private readonly List<PropertyFeature> _features = new();

    public string Title { get; private set; }
    public string Description { get; private set; }
    public Location Location { get; private set; }
    public ListingKind ListingKind { get; private set; }
    public SaleTerms? SaleTerms { get; private set; }
    public RentTerms? RentTerms { get; private set; }
    public Guid PropertyTypeId { get; private set; }
    public PropertyStatus Status { get; private set; } = PropertyStatus.Draft;

    public bool IsAvailable => Status == PropertyStatus.Published;
    public PropertySpecs PropertySpecs { get; private set; }

    // read-only views out. AsReadOnly() blocks a caller from casting back to List and mutating.
    public IReadOnlyCollection<Media> Media => _media.AsReadOnly();
    public IReadOnlyCollection<PropertyFeature> PropertyFeatures => _features.AsReadOnly();

    private Property() { }   // EF Core

    private Property(Guid id, string title, string description,
                     Guid typeId, Location location,
                     ListingKind kind, SaleTerms? sale, RentTerms? rent, PropertySpecs? specs = null)
        : base(id)
    {
        Title = title;
        Description = description ?? string.Empty;
        PropertyTypeId = typeId;
        Location = location;
        ListingKind = kind;
        SaleTerms = sale;
        RentTerms = rent;
        Status = PropertyStatus.Draft;
        PropertySpecs = specs ?? new PropertySpecs();
    }

    // ---- creation & editing -------------------------------------------------

    public static Result<Property> Create(Guid id, string title, string description,
        Guid typeId, Location location, ListingKind kind, SaleTerms? sale, RentTerms? rent, PropertySpecs? specs = null)
    {
        if (Validate(title, description, typeId, location, kind, sale, rent, specs) is { } error)
            return error;

        return new Property(id, title, description, typeId, location, kind, sale, rent);
    }

    public Result<Updated> Update(string title, string description,
        Guid typeId, Location location, ListingKind kind, SaleTerms? sale, RentTerms? rent, PropertySpecs? specs = null)
    {
        if (Validate(title, description, typeId, location, kind, sale, rent) is { } error)
            return error;

        Title = title;
        Description = description ?? string.Empty;
        PropertyTypeId = typeId;
        Location = location;
        ListingKind = kind;
        SaleTerms = kind == ListingKind.Sale ? sale : null;
        RentTerms = kind == ListingKind.Rent ? rent : null;

        return Result.Updated;
    }

    // One home for the rules. Both Create and Update call this, so they can never drift apart.
    // Returns the first broken rule, or null if everything is valid.
    // (Assumes your error type is named `Error`. Rename if yours is different.)
    private static Error? Validate(string title, string description, Guid typeId,
        Location location, ListingKind kind, SaleTerms? sale, RentTerms? rent, PropertySpecs? specs = null)
    {
        if (string.IsNullOrWhiteSpace(title))
            return PropertyErrors.TitleRequired;

        if (title.Length < PropertyConstants.MinTitleLength)
            return PropertyErrors.TitleTooShort;

        if (title.Length > PropertyConstants.MaxTitleLength)
            return PropertyErrors.TitleTooLong;

        // guard the null first — the old code called description.Length and could crash
        if (!string.IsNullOrEmpty(description) &&
            description.Length > PropertyConstants.MaxDescriptionLength)
            return PropertyErrors.DescriptionTooLong;

        if (typeId == Guid.Empty)
            return PropertyErrors.PropertyTypeRequired;

        if (location is null)
            return PropertyErrors.LocationRequired;

        if (kind == ListingKind.Sale && sale is null)
            return PropertyErrors.SaleTermsRequired;

        if (kind == ListingKind.Rent && rent is null)
            return PropertyErrors.RentTermsRequired;
        if (specs is not null)
        {
            if (specs.NumberOfRooms < 0)
                return PropertyErrors.InvalidNumberOfRooms;

            if (specs.AreaInSquareMeters < 0)
                return PropertyErrors.InvalidArea;

            if (specs.Bathrooms < 0)
                return PropertyErrors.InvalidNumberOfBathrooms;
        }

        return null;
    }

    // ---- media (a collection this aggregate owns) ---------------------------

    public Result<Updated> AddMedia(Media media)
    {
        if (media is null)
            return PropertyErrors.MediaRequired;

        if (_media.Count >= PropertyConstants.MaxMediaItems)
            return PropertyErrors.TooManyMediaItems;

        if (media.IsPrimary && _media.Any(m => m.IsPrimary))
            return PropertyErrors.MultiplePrimaryMedia;

        _media.Add(media);
        return Result.Updated;
    }

    // Batch add now enforces the SAME rules as the single add — no unguarded back door.
    // It checks the whole batch before mutating, so it is all-or-nothing.
    public Result<Updated> AddMedia(IReadOnlyCollection<Media> mediaItems)
    {
        if (mediaItems is null || mediaItems.Count == 0)
            return PropertyErrors.MediaRequired;

        if (_media.Count + mediaItems.Count > PropertyConstants.MaxMediaItems)
            return PropertyErrors.TooManyMediaItems;

        var totalPrimary = _media.Count(m => m.IsPrimary)
                         + mediaItems.Count(m => m.IsPrimary);
        if (totalPrimary > 1)
            return PropertyErrors.MultiplePrimaryMedia;

        _media.AddRange(mediaItems);
        return Result.Updated;
    }

    public Result<Updated> RemoveMedia(Media media)
    {
        if (media is null)
            return PropertyErrors.MediaRequired;

        if (!_media.Remove(media))
            return PropertyErrors.MediaNotFound;

        return Result.Updated;
    }

    public Result<Updated> RemoveMedia(IReadOnlyCollection<Media> mediaItems)
    {
        if (mediaItems is null || mediaItems.Count == 0)
            return PropertyErrors.MediaRequired;

        if (mediaItems.Any(m => !_media.Contains(m)))
            return PropertyErrors.MediaNotFound;

        _media.RemoveAll(mediaItems.Contains);
        return Result.Updated;
    }

    // ---- features (encapsulated exactly like media) -------------------------

    public Result<Updated> AddFeature(PropertyFeature feature)
    {
        if (feature is null)
            return PropertyErrors.FeatureRequired;

        if (_features.Contains(feature))
            return PropertyErrors.DuplicateFeature;

        _features.Add(feature);
        return Result.Updated;
    }
    public Result<Updated> AddFeatures(IReadOnlyCollection<PropertyFeature> features)
    {
        if (features is null || features.Count == 0)
            return PropertyErrors.FeatureRequired;

        if (features.Any(f => _features.Contains(f)))
            return PropertyErrors.DuplicateFeature;

        _features.AddRange(features);
        return Result.Updated;
    }

    public Result<Updated> RemoveFeature(PropertyFeature feature)
    {
        if (feature is null)
            return PropertyErrors.FeatureRequired;

        if (!_features.Remove(feature))
            return PropertyErrors.FeatureNotFound;

        return Result.Updated;
    }
    public Result<Updated> RemoveFeatures(IReadOnlyCollection<PropertyFeature> features)
    {
        if (features is null || features.Count == 0)
            return PropertyErrors.FeatureRequired;

        if (features.Any(f => !_features.Contains(f)))
            return PropertyErrors.FeatureNotFound;

        _features.RemoveAll(features.Contains);
        return Result.Updated;
    }

    // ---- state transitions (no generic status setter) -----------------------

    public Result<Updated> Publish()
    {
        if (Status == PropertyStatus.Published)
            return PropertyErrors.AlreadyPublished;

        if (Status == PropertyStatus.Archived || Status == PropertyStatus.Sold || Status == PropertyStatus.Rented)
            return PropertyErrors.NotPublishable;

        Status = PropertyStatus.Published;
        return Result.Updated;
    }

    public Result<Updated> Unpublish()
    {
        if (Status != PropertyStatus.Published)
            return PropertyErrors.NotPublished;

        Status = PropertyStatus.Draft;
        return Result.Updated;
    }

    public Result<Updated> Archive()
    {
        if (Status == PropertyStatus.Archived)
            return PropertyErrors.AlreadyArchived;

        Status = PropertyStatus.Archived;
        return Result.Updated;
    }

    public Result<Updated> MarkAsSold()
    {
        if (Status != PropertyStatus.Published)
            return PropertyErrors.NotPublished;

        Status = PropertyStatus.Sold;
        return Result.Updated;
    }

    public Result<Updated> MarkAsRented()
    {
        if (Status != PropertyStatus.Published)
            return PropertyErrors.NotPublished;

        Status = PropertyStatus.Rented;
        return Result.Updated;
    }

    public Result<Updated> UpdateLocation(Location location)
    {
        if (location is null)
            return PropertyErrors.LocationRequired;

        Location = location;
        return Result.Updated;
    }

    public Result<Updated> UpdateListingKind(ListingKind kind, SaleTerms? sale, RentTerms? rent)
    {
        if (kind == ListingKind.Sale && sale is null)
            return PropertyErrors.SaleTermsRequired;

        if (kind == ListingKind.Rent && rent is null)
            return PropertyErrors.RentTermsRequired;

        ListingKind = kind;
        SaleTerms = kind == ListingKind.Sale ? sale : null;   // clear stale terms of the other kind
        RentTerms = kind == ListingKind.Rent ? rent : null;

        return Result.Updated;
    }

    public Result<Updated> UpdatePropertyType(Guid typeId)
    {
        if (typeId == Guid.Empty)
            return PropertyErrors.PropertyTypeRequired;

        PropertyTypeId = typeId;
        return Result.Updated;
    }

    public Result<Updated> UpdatePropertySpecs(PropertySpecs specs)
    {
        if (specs is null)
            return PropertyErrors.FeatureRequired;

        if (specs.NumberOfRooms < 0)
            return PropertyErrors.InvalidNumberOfRooms;

        if (specs.AreaInSquareMeters < 0)
            return PropertyErrors.InvalidArea;

        if (specs.Bathrooms < 0)
            return PropertyErrors.InvalidNumberOfBathrooms;

        PropertySpecs = specs;
        return Result.Updated;
    }

}