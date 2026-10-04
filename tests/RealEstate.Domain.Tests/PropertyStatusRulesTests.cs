using RealEstate.Domain.Enums;

namespace RealEstate.Domain.Tests;

/// <summary>
/// The status machine. Every test here is a rule that was broken and is now enforced —
/// each one fails if the corresponding fix is reverted.
/// </summary>
public class PropertyStatusRulesTests
{
    // ---- a closed deal cannot be laundered through the archive --------------------------
    // Sold and Rented were already non-publishable, but Archive had no such rule. So
    // Sold -> Archive -> Publish was two legal steps that together put a sold property back
    // on the market, which is exactly what the single rule forbids.

    [Fact]
    public void A_sold_listing_cannot_be_republished_by_archiving_it_first()
    {
        var property = TestData.PublishedProperty(ListingKind.Sale);
        Assert.True(property.MarkAsSold().IsSuccess);
        Assert.True(property.Archive().IsSuccess);

        var result = property.Publish();

        Assert.True(result.IsError);
        Assert.Equal("Property.ClosedDealNotPublishable", result.TopError.Code);
        Assert.Equal(PropertyStatus.Archived, property.Status);
    }

    [Fact]
    public void A_rented_listing_cannot_be_republished_by_archiving_it_first()
    {
        var property = TestData.PublishedProperty(ListingKind.Rent);
        Assert.True(property.MarkAsRented().IsSuccess);
        Assert.True(property.Archive().IsSuccess);

        Assert.Equal("Property.ClosedDealNotPublishable", property.Publish().TopError.Code);
    }

    [Fact]
    public void An_archived_draft_can_still_be_restored()
    {
        // The rule above must not break the admin console's "Restore (Publish)" button for
        // ordinary listings: only CLOSED deals are blocked, not everything archived.
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
