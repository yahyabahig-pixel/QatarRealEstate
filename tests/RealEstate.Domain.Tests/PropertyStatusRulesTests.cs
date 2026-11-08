using RealEstate.Domain.Enums;

namespace RealEstate.Domain.Tests;

/// <summary>
/// The status machine. Every test here is a rule that was broken and is now enforced —
/// each one fails if the corresponding fix is reverted.
/// </summary>
public class PropertyStatusRulesTests
{
    // ---- a unit can be let, and let again, and again -------------------------------------
    //
    //  These two used to assert the opposite. Sold and Rented were terminal: a flat could be
    //  let exactly once in its life, and archiving it first was blocked too so the two steps
    //  could not be used to get around that.
    //
    //  Right for an agency selling a flat once. Wrong for this company, which owns its
    //  buildings and re-lets the same units every year — the day a tenant moved out, the
    //  listing was finished, and the same flat had to be entered again from nothing. The
    //  rule is reversed, and these hold it reversed.

    [Fact]
    public void A_rented_unit_goes_back_on_the_market_when_the_tenant_leaves()
    {
        var property = TestData.PublishedProperty(ListingKind.Rent);
        Assert.True(property.MarkAsRented().IsSuccess);

        Assert.True(property.Publish().IsSuccess);
        Assert.Equal(PropertyStatus.Published, property.Status);
    }

    [Fact]
    public void A_sold_listing_can_be_put_back_up()
    {
        var property = TestData.PublishedProperty(ListingKind.Sale);
        Assert.True(property.MarkAsSold().IsSuccess);

        Assert.True(property.Publish().IsSuccess);
        Assert.Equal(PropertyStatus.Published, property.Status);
    }

    [Fact]
    public void A_closed_listing_can_be_restored_through_the_archive_too()
    {
        var property = TestData.PublishedProperty(ListingKind.Rent);
        Assert.True(property.MarkAsRented().IsSuccess);
        Assert.True(property.Archive().IsSuccess);

        Assert.True(property.Publish().IsSuccess);
        Assert.Equal(PropertyStatus.Published, property.Status);
        Assert.Null(property.StatusBeforeArchive);
    }

    /// <summary>
    /// The whole point: the same flat round the cycle twice, with nothing re-entered.
    /// </summary>
    [Fact]
    public void The_same_unit_survives_more_than_one_tenancy()
    {
        var property = TestData.PublishedProperty(ListingKind.Rent);

        for (var tenancy = 0; tenancy < 3; tenancy++)
        {
            Assert.True(property.MarkAsRented().IsSuccess);
            Assert.Equal(PropertyStatus.Rented, property.Status);

            Assert.True(property.Publish().IsSuccess);
            Assert.Equal(PropertyStatus.Published, property.Status);
        }
    }

    /// <summary>
    /// Pausing a closed listing without putting it back on the site — the owner's other
    /// route. Unpublish used to require the listing to be Published, so a rented unit could
    /// not even become a draft.
    /// </summary>
    [Fact]
    public void A_rented_unit_can_be_parked_as_a_draft()
    {
        var property = TestData.PublishedProperty(ListingKind.Rent);
        Assert.True(property.MarkAsRented().IsSuccess);

        Assert.True(property.Unpublish().IsSuccess);
        Assert.Equal(PropertyStatus.Draft, property.Status);
    }

    [Fact]
    public void An_archived_draft_can_still_be_restored()
    {
        var property = TestData.Property();
        Assert.True(property.Archive().IsSuccess);

        Assert.True(property.Publish().IsSuccess);
        Assert.Equal(PropertyStatus.Published, property.Status);
        Assert.Null(property.StatusBeforeArchive);
    }

    [Fact]
    public void An_archived_published_listing_can_be_restored()
    {
        var property = TestData.PublishedProperty();
        Assert.True(property.Archive().IsSuccess);

        Assert.True(property.Publish().IsSuccess);
        Assert.Equal(PropertyStatus.Published, property.Status);
    }

    // ---- what a transition still refuses -------------------------------------------------
    // Only being asked for the state it is already in, which is a mis-click and not a
    // decision. Every refusal below leaves the status untouched.

    [Fact]
    public void Asking_for_the_state_it_is_already_in_is_refused()
    {
        var published = TestData.PublishedProperty();
        Assert.Equal("Property.AlreadyPublished", published.Publish().TopError.Code);
        Assert.Equal(PropertyStatus.Published, published.Status);

        var draft = TestData.Property();
        Assert.Equal("Property.AlreadyDraft", draft.Unpublish().TopError.Code);
        Assert.Equal(PropertyStatus.Draft, draft.Status);

        var archived = TestData.PublishedProperty();
        Assert.True(archived.Archive().IsSuccess);
        Assert.Equal("Property.AlreadyArchived", archived.Archive().TopError.Code);

        var rented = TestData.PublishedProperty(ListingKind.Rent);
        Assert.True(rented.MarkAsRented().IsSuccess);
        Assert.Equal("Property.AlreadyRented", rented.MarkAsRented().TopError.Code);
        Assert.Equal(PropertyStatus.Rented, rented.Status);

        var sold = TestData.PublishedProperty(ListingKind.Sale);
        Assert.True(sold.MarkAsSold().IsSuccess);
        Assert.Equal("Property.AlreadySold", sold.MarkAsSold().TopError.Code);
    }

    /// <summary>
    /// An outcome can be recorded from any state now, not only from Published — a draft that
    /// was let before anyone got round to publishing it still has to be markable.
    /// </summary>
    [Fact]
    public void An_outcome_can_be_recorded_without_publishing_first()
    {
        var draft = TestData.Property(ListingKind.Rent);
        Assert.Equal(PropertyStatus.Draft, draft.Status);

        Assert.True(draft.MarkAsRented().IsSuccess);
        Assert.Equal(PropertyStatus.Rented, draft.Status);
    }

    // ---- the outcome has to match the listing kind ---------------------------------------
    // "Sold" and "Rented" were interchangeable, so a rental could be closed as Sold — which
    // is then what the dashboard counts and what the card says.

    [Fact]
    public void A_rental_cannot_be_marked_as_sold()
    {
        var property = TestData.PublishedProperty(ListingKind.Rent);

        var result = property.MarkAsSold();

        Assert.True(result.IsError);
        Assert.Equal("Property.OutcomeDoesNotMatchListingKind", result.TopError.Code);
        Assert.Equal(PropertyStatus.Published, property.Status);
    }

    [Fact]
    public void A_sale_cannot_be_marked_as_rented()
    {
        var property = TestData.PublishedProperty(ListingKind.Sale);

        var result = property.MarkAsRented();

        Assert.True(result.IsError);
        Assert.Equal("Property.OutcomeDoesNotMatchListingKind", result.TopError.Code);
    }

    [Fact]
    public void A_sale_can_be_marked_as_sold_and_a_rental_as_rented()
    {
        var sale = TestData.PublishedProperty(ListingKind.Sale);
        Assert.True(sale.MarkAsSold().IsSuccess);
        Assert.Equal(PropertyStatus.Sold, sale.Status);

        var rental = TestData.PublishedProperty(ListingKind.Rent);
        Assert.True(rental.MarkAsRented().IsSuccess);
        Assert.Equal(PropertyStatus.Rented, rental.Status);
    }

    // ---- "featured" only ever applies to something that is actually on the site ----------
    // Only a published listing may be featured, but nothing dropped the flag on the way out,
    // so a draft could sit in the database marked "Exclusive" and came back promoted.

    [Fact]
    public void Unpublishing_clears_the_featured_flag()
    {
        var property = TestData.PublishedProperty();
        Assert.True(property.Feature().IsSuccess);
        Assert.True(property.IsFeatured);

        Assert.True(property.Unpublish().IsSuccess);

        Assert.False(property.IsFeatured);
    }

    [Fact]
    public void Archiving_clears_the_featured_flag()
    {
        var property = TestData.PublishedProperty();
        Assert.True(property.Feature().IsSuccess);

        Assert.True(property.Archive().IsSuccess);

        Assert.False(property.IsFeatured);
    }

    [Fact]
    public void Closing_a_deal_clears_the_featured_flag()
    {
        var property = TestData.PublishedProperty(ListingKind.Sale);
        Assert.True(property.Feature().IsSuccess);

        Assert.True(property.MarkAsSold().IsSuccess);

        Assert.False(property.IsFeatured);
    }
}
