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
    private List<Media> _media = new();
    private List<PropertyFeature> _propertyFeatures = new();

    public string Title { get; private set; } = null!;
    public string Description { get; private set; } = null!;
    public Location Location { get; private set; } = null!;
    public ListingKind ListingKind { get; private set; }
    public SaleTerms? SaleTerms { get; private set; }
    public RentTerms? RentTerms { get; private set; }
    public Guid PropertyTypeId { get; private set; }

    // Link to the curated Areas catalog ("The Pearl", "West Bay", ...). Nullable: a listing
    // can exist before it is filed under an area, but WHEN set it must reference a real Area
    // row — the application handler validates it and the database enforces it as an FK.
    // Location (below) stays the street-level ADDRESS; AreaId is the catalog classification.
    public Guid? AreaId { get; private set; }

    public PropertyStatus Status { get; private set; } = PropertyStatus.Draft;

    public bool IsAvailable => Status == PropertyStatus.Published;
    public PropertySpecs PropertySpecs { get; private set; } = null!;
    public Money? Offer { get; private set; }


    public bool IsActive { get; private set; } = true;
    public bool IsFeatured { get; private set; }
    public int ViewsCount { get; private set; }

    // read-only views out. AsReadOnly() blocks a caller from casting back to List and mutating.
    public IReadOnlyCollection<Media> Media => _media.AsReadOnly();
    public IReadOnlyCollection<PropertyFeature> PropertyFeatures => _propertyFeatures.AsReadOnly();

    private Property() { }   // EF Core

    private Property(Guid id,
                     string title,
                     string description,
                     Guid typeId,
                     Location location,
                     ListingKind kind,
                     SaleTerms? sale,
                     RentTerms? rent,
                     PropertySpecs? specs = null,
                     Money? offer = null
                    )
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
        Offer = offer;
    }

    // ---- creation & editing -------------------------------------------------

    public static Result<Property> Create(Guid id, string title, string description,
        Guid typeId, Location location, ListingKind kind, SaleTerms? sale, RentTerms? rent, PropertySpecs? specs = null, Money? offer = null)
    {
        if (Validate(title, description, typeId, location, kind, sale, rent, specs) is { } error)
            return error;

        return new Property(id, title, description, typeId, location, kind, sale, rent, specs, offer);
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

    /// <summary>Files this listing under a catalog Area (or clears it with null). Existence
    /// of the area is the application layer's job — the aggregate cannot see other tables.</summary>
    public Result<Updated> AssignArea(Guid? areaId)
    {
        AreaId = areaId == Guid.Empty ? null : areaId;
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

    // Identity for a feature link is the CATALOG FeatureId, never object identity.
    // PropertyFeature has no value equality, so List.Contains() compares REFERENCES: a
    // freshly built link is never "equal" to the one already loaded from the database.
    // Leaning on it is what let duplicate rows through to UX_PropertyFeature_NoDuplicates
    // and surfaced as a 500 on the second save of the same selection.
    private bool HasFeature(Guid featureId) => _propertyFeatures.Any(f => f.FeatureId == featureId);

    public Result<Updated> AddFeature(PropertyFeature feature)
    {
        if (feature is null) return PropertyErrors.FeatureRequired;

        if (HasFeature(feature.FeatureId)) return PropertyErrors.DuplicateFeature;

        _propertyFeatures.Add(feature);
        return Result.Updated;
    }

    public Result<Updated> AddFeatures(IReadOnlyCollection<PropertyFeature> features)
    {
        if (features is null || features.Count == 0)
            return PropertyErrors.FeatureRequired;

        if (features.Any(f => f is null))
            return PropertyErrors.FeatureRequired;

        // Duplicates WITHIN the incoming batch, and duplicates against what is already
        // attached, are both caught here rather than by the database.
        if (features.Select(f => f.FeatureId).Distinct().Count() != features.Count)
            return PropertyErrors.DuplicateFeature;

        if (features.Any(f => HasFeature(f.FeatureId)))
            return PropertyErrors.DuplicateFeature;

        _propertyFeatures.AddRange(features);
        return Result.Updated;
    }

    // Wholesale replace of the amenity selection -- what PUT /features has always claimed
    // to do. Idempotent: submitting the same selection twice is a no-op, not a crash.
    // An EMPTY collection is legitimate and means "the admin unticked everything";
    // only null is rejected.
    public Result<Updated> ReplaceFeatures(IReadOnlyCollection<PropertyFeature> features)
    {
        if (features is null) return PropertyErrors.FeatureRequired;

        if (features.Any(f => f is null)) return PropertyErrors.FeatureRequired;

        if (features.Select(f => f.FeatureId).Distinct().Count() != features.Count)
            return PropertyErrors.DuplicateFeature;

        var incoming = features.ToDictionary(f => f.FeatureId);

        // 1) Links no longer selected. EF cascade-deletes the orphaned rows: the PropertyId
        //    FK is required and the collection is owned by this aggregate.
        _propertyFeatures.RemoveAll(existing => !incoming.ContainsKey(existing.FeatureId));

        // 2) Links that survive keep their row identity -- no delete/insert churn, no unique
        //    index violation -- and simply take the newly submitted value.
        foreach (var existing in _propertyFeatures)
        {
            existing.SetValue(incoming[existing.FeatureId].Value);
            incoming.Remove(existing.FeatureId);
        }

        // 3) Whatever is left over was not attached before: genuinely new.
        _propertyFeatures.AddRange(incoming.Values);
        return Result.Updated;
    }

    public Result<Updated> RemoveFeature(PropertyFeature feature)
    {
        if (feature is null)
            return PropertyErrors.FeatureRequired;

        var attached = _propertyFeatures.FirstOrDefault(f => f.FeatureId == feature.FeatureId);
        if (attached is null)
            return PropertyErrors.FeatureNotFound;

        _propertyFeatures.Remove(attached);
        return Result.Updated;
    }

    public Result<Updated> RemoveFeatures(IReadOnlyCollection<PropertyFeature> features)
    {
        if (features is null || features.Count == 0)
            return PropertyErrors.FeatureRequired;

        if (features.Any(f => f is null))
            return PropertyErrors.FeatureRequired;

        var ids = features.Select(f => f.FeatureId).ToHashSet();

        if (ids.Any(id => !HasFeature(id)))
            return PropertyErrors.FeatureNotFound;

        _propertyFeatures.RemoveAll(f => ids.Contains(f.FeatureId));
        return Result.Updated;
    }

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

    public Result<Updated> SetOffer(Money? offer)
    {
        if (offer is null)
        {
            Offer = null;
            return Result.Updated;
        }

        if (SaleTerms is null)
            return PropertyErrors.ListingTermsMissing;

        if (!string.Equals(offer.Currency, SaleTerms.Price.Currency, StringComparison.OrdinalIgnoreCase))
            return Error.Validation("Property.Offer.CurrencyMismatch", "Offer currency must match the sale currency.");

        if (offer.Amount > SaleTerms.Price.Amount)
            return Error.Validation("Property.Offer.TooHigh", "Offer must not exceed the asking price.");

        Offer = offer;
        return Result.Updated;
    }

    public Result<Updated> Activate()
    {
        if (IsActive) return PropertyErrors.AlreadyActive;          // add to PropertyErrors
        IsActive = true;
        return Result.Updated;
    }

    public Result<Updated> Deactivate()
    {
        if (!IsActive) return PropertyErrors.AlreadyInactive;       // add to PropertyErrors
        IsActive = false;
        return Result.Updated;
    }

    public Result<Updated> Feature()
    {
        if (Status != PropertyStatus.Published) return PropertyErrors.OnlyPublishedCanBeFeatured;  // add
        IsFeatured = true;
        return Result.Updated;
    }

    public Result<Updated> Unfeature()
    {
        IsFeatured = false;
        return Result.Updated;
    }
}