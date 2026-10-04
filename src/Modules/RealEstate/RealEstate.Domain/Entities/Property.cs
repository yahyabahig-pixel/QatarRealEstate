using System.Security.Cryptography.X509Certificates;
using System.Globalization;
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

    // The consultant who represents this listing on the public site ("Listed by ..." card,
    // WhatsApp contact). Nullable: a listing can exist unassigned. Configured with a SetNull
    // FK -- deleting an agent unassigns their listings, it never deletes or blocks them.
    public Guid? AgentId { get; private set; }

    public PropertyStatus Status { get; private set; } = PropertyStatus.Draft;

    // Where Archive() was called from, so Publish() can refuse to bring a CLOSED deal back
    // (Sold -> Archive -> Publish). Mapped as a nullable column; null means "archived from
    // Draft or Published", or a row written before this column existed, and both are
    // publishable. See Publish().
    private PropertyStatus? _statusBeforeArchive;
    public PropertyStatus? StatusBeforeArchive => _statusBeforeArchive;

    public bool IsAvailable => Status == PropertyStatus.Published;
    public PropertySpecs PropertySpecs { get; private set; } = null!;
    public Money? Offer { get; private set; }


    public bool IsActive { get; private set; } = true;
    public bool IsFeatured { get; private set; }
    public int ViewsCount { get; private set; }

    // Sold before completion. A listing-level flag rather than a status: an off-plan unit
    // moves through the same Draft -> Published -> Sold lifecycle as any other, it is only
    // the delivery that is in the future. Distinct from IsFeatured, which is the existing
    // "Exclusive" concept and stays what it is.
    public bool IsOffPlan { get; private set; }

    // "Price on request": the listing still carries its real SaleTerms/RentTerms — the
    // aggregate requires them for its ListingKind and that invariant is unchanged — this
    // flag only says the figure must not be published. Presentation, not pricing, so the
    // brokerage keeps a usable number internally while the public page shows "on request".
    public bool PriceOnRequest { get; private set; }

    // Numeric mirror of Location.YCoordinate / Location.XCoordinate.
    //
    // The value object keeps the authoritative strings and stays untouched. These two exist
    // only so the map viewport query can do an indexed BETWEEN on real floats: a nvarchar(50)
    // column cannot answer "which listings fall inside these bounds" without parsing every
    // row. They are never set from outside -- SetLocation derives them, so there is exactly
    // one write path and the two representations cannot drift.
    public double? Latitude { get; private set; }
    public double? Longitude { get; private set; }

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
        SetLocation(location);
        ListingKind = kind;
        Status = PropertyStatus.Draft;
        PropertySpecs = specs ?? new PropertySpecs();

        // Update() already dropped the terms of the other kind; the constructor did not, so a
        // command that sent both blocks created a listing carrying a sale price AND a rent
        // price. Only one of them is ever the truth, and the queries pick whichever they find
        // first — so the card could show a price no one had set for this listing's kind.
        SaleTerms = kind == ListingKind.Sale ? sale : null;
        RentTerms = kind == ListingKind.Rent ? rent : null;

        // Same test Update() and UpdateListingKind() apply. An offer has to beat the price it
        // discounts, and the price it discounts is the one for THIS kind — so an offer handed
        // in alongside terms of the wrong kind is not an offer at all. Assigned after the
        // terms above, because OfferStillValid() reads them.
        Offer = offer;
        if (Offer is not null && !OfferStillValid())
            Offer = null;
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
        SetLocation(location);
        ListingKind = kind;
        SaleTerms = kind == ListingKind.Sale ? sale : null;
        RentTerms = kind == ListingKind.Rent ? rent : null;

        // An accepted offer belongs to the terms it was accepted against. Lower the asking
        // price below it, or turn the listing from a sale into a rental, and the stored offer
        // becomes a figure the domain would refuse to accept today — SetOffer enforces
        // "offer <= asking price" on the way in, and nothing re-checked it afterwards. The
        // card then showed an offer HIGHER than the price, and search ranked the listing by it.
        if (Offer is not null && !OfferStillValid())
            Offer = null;

        return Result.Updated;
    }

    /// <summary>
    /// Whether the stored offer is still consistent with the current terms. Same rule as
    /// SetOffer, in one place so the two cannot drift.
    /// </summary>
    private bool OfferStillValid() =>
        Offer is not null
        && SaleTerms is not null
        && string.Equals(Offer.Currency, SaleTerms.Price.Currency, StringComparison.OrdinalIgnoreCase)
        && Offer.Amount <= SaleTerms.Price.Amount;

    /// <summary>Files this listing under a catalog Area (or clears it with null). Existence
    /// of the area is the application layer's job — the aggregate cannot see other tables.</summary>
    public Result<Updated> AssignArea(Guid? areaId)
    {
        AreaId = areaId == Guid.Empty ? null : areaId;
        return Result.Updated;
    }

    // Same contract as AssignArea: Guid.Empty and null both mean "no agent assigned".
    public Result<Updated> AssignAgent(Guid? agentId)
    {
        AgentId = agentId == Guid.Empty ? null : agentId;
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

    /// <summary>
    /// Puts the gallery in the given order and makes the first item the cover.
    ///
    /// The ids must be exactly the ones this property already has — no more, no fewer. A
    /// partial list would silently leave the rest of the gallery in an order nobody chose,
    /// and an id from another listing is a caller mistake worth reporting, not absorbing.
    /// </summary>
    public Result<Updated> ReorderMedia(IReadOnlyList<Guid> orderedMediaIds)
    {
        if (orderedMediaIds is null || orderedMediaIds.Count == 0)
            return PropertyErrors.MediaRequired;

        if (orderedMediaIds.Distinct().Count() != orderedMediaIds.Count)
            return PropertyErrors.MediaOrderInvalid;

        if (orderedMediaIds.Count != _media.Count)
            return PropertyErrors.MediaOrderInvalid;

        var byId = _media.ToDictionary(m => m.Id);
        if (orderedMediaIds.Any(id => !byId.ContainsKey(id)))
            return PropertyErrors.MediaNotFound;

        for (var i = 0; i < orderedMediaIds.Count; i++)
        {
            var media = byId[orderedMediaIds[i]];
            // Position AND cover in one pass: "first in the gallery" and "the primary image"
            // are the same idea, and keeping them as two facts is how they drift apart.
            media.SetPosition(i, isPrimary: i == 0);
        }

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

        // Sold and Rented stay non-publishable: re-listing a closed deal is a business
        // decision, not a status flip. ARCHIVED is different — the admin console offers
        // "Restore (Publish)" on archived listings, so the domain must allow it; without
        // this an archived listing was permanently stuck (no transition out at all).
        //
        // But archiving must not LAUNDER a closed deal. Sold -> Archive -> Publish was two
        // legal steps that together did what the rule above forbids, and put a sold property
        // back on the market. _statusBeforeArchive remembers where it came from.
        if (Status == PropertyStatus.Sold || Status == PropertyStatus.Rented)
            return PropertyErrors.NotPublishable;

        if (Status == PropertyStatus.Archived &&
            _statusBeforeArchive is PropertyStatus.Sold or PropertyStatus.Rented)
            return PropertyErrors.ClosedDealNotPublishable;

        Status = PropertyStatus.Published;
        _statusBeforeArchive = null;
        return Result.Updated;
    }

    public Result<Updated> Unpublish()
    {
        if (Status != PropertyStatus.Published)
            return PropertyErrors.NotPublished;

        Status = PropertyStatus.Draft;

        // Only a published listing may be featured (see Feature()), so unpublishing has to
        // drop the flag as well — otherwise the invariant holds on the way in and not on the
        // way out, and a draft sits in the database marked as an "Exclusive".
        IsFeatured = false;
        return Result.Updated;
    }

    public Result<Updated> Archive()
    {
        if (Status == PropertyStatus.Archived)
            return PropertyErrors.AlreadyArchived;

        _statusBeforeArchive = Status;
        Status = PropertyStatus.Archived;

        // An archived listing is off the site, so it cannot also be one of the site's
        // highlights. Leaving IsFeatured set meant an unpublished listing kept its star in the
        // admin grid and came back promoted the moment it was restored.
        IsFeatured = false;
        return Result.Updated;
    }

    public Result<Updated> MarkAsSold()
    {
        if (Status != PropertyStatus.Published)
            return PropertyErrors.NotPublished;

        // A rental is not sold and a sale is not rented. The two outcomes were interchangeable
        // before, so a rental could be closed as "Sold" — which is then what the dashboard
        // counts and what the card says.
        if (ListingKind != ListingKind.Sale)
            return PropertyErrors.OutcomeDoesNotMatchListingKind;

        Status = PropertyStatus.Sold;
        IsFeatured = false;
        return Result.Updated;
    }

    public Result<Updated> MarkAsRented()
    {
        if (Status != PropertyStatus.Published)
            return PropertyErrors.NotPublished;

        if (ListingKind != ListingKind.Rent)
            return PropertyErrors.OutcomeDoesNotMatchListingKind;

        Status = PropertyStatus.Rented;
        IsFeatured = false;
        return Result.Updated;
    }

    public Result<Updated> UpdateLocation(Location location)
    {
        if (location is null)
            return PropertyErrors.LocationRequired;

        SetLocation(location);
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

        if (Offer is not null && !OfferStillValid())
            Offer = null;

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

    public Result<Updated> MarkOffPlan()
    {
        IsOffPlan = true;
        return Result.Updated;
    }

    public Result<Updated> ClearOffPlan()
    {
        IsOffPlan = false;
        return Result.Updated;
    }

    // Unconditional on purpose: hiding or revealing the asking price is an editorial
    // decision, not a lifecycle transition, so there is no status it can be illegal in.
    public Result<Updated> MarkPriceOnRequest()
    {
        PriceOnRequest = true;
        return Result.Updated;
    }

    public Result<Updated> ClearPriceOnRequest()
    {
        PriceOnRequest = false;
        return Result.Updated;
    }

    // The ONLY place Location is assigned. Every write path -- the constructor, Update and
    // UpdateLocation -- goes through here, so Latitude/Longitude can never fall out of step
    // with the strings they mirror.
    private void SetLocation(Location location)
    {
        Location = location;

        // Location.Create already refuses unparseable coordinates, but the private EF
        // constructor bypasses the factory and rows written before this column existed can
        // carry anything. So parse defensively — through the SAME helper the factory
        // validates with, which is what stops the two from ever disagreeing again.
        var hasLng = Location.TryParseCoordinate(location.XCoordinate, -180, 180, out var lng);
        var hasLat = Location.TryParseCoordinate(location.YCoordinate, -90, 90, out var lat);

        // Half a position is not a position, and 0,0 is the placeholder the admin form used
        // to send rather than a real address in the Gulf of Guinea. Both cases resolve to
        // "unknown", which is what makes the frontend hide the map instead of pointing at
        // the wrong continent.
        var usable = hasLat && hasLng && !(lat == 0d && lng == 0d);

        Latitude  = usable ? lat : null;
        Longitude = usable ? lng : null;
    }
}