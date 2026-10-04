using RealEstate.Domain.Enums;

namespace RealEstate.Domain.Tests;

/// <summary>
/// Sale terms and rent terms are mutually exclusive: a listing carries the terms of its own
/// kind and nothing else. The constructor used to store whatever it was handed, and changing
/// a listing's kind left the old terms in place — so a listing could be a Rent with a sale
/// price still attached, which is what the price column then read.
/// </summary>
public class PropertyTermsTests
{
    [Fact]
    public void A_sale_listing_does_not_keep_rent_terms_it_was_handed()
    {
        var result = Domain.Entities.Property.Create(
            id: Guid.NewGuid(), title: "Sale listing", description: "…",
            typeId: Guid.NewGuid(), location: TestData.Location(),
            kind: ListingKind.Sale,
            sale: TestData.SaleTerms(),
            rent: TestData.RentTerms());          // <- wrong kind, passed anyway

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value.SaleTerms);
        Assert.Null(result.Value.RentTerms);
    }

    [Fact]
    public void A_rent_listing_does_not_keep_sale_terms_it_was_handed()
    {
        var result = Domain.Entities.Property.Create(
            id: Guid.NewGuid(), title: "Rent listing", description: "…",
            typeId: Guid.NewGuid(), location: TestData.Location(),
            kind: ListingKind.Rent,
            sale: TestData.SaleTerms(),
            rent: TestData.RentTerms());

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value.SaleTerms);
        Assert.NotNull(result.Value.RentTerms);
    }

    [Fact]
    public void Switching_a_listing_from_sale_to_rent_drops_the_sale_price()
    {
        var property = TestData.Property(ListingKind.Sale);
        Assert.NotNull(property.SaleTerms);

        var result = property.UpdateListingKind(ListingKind.Rent, sale: null, rent: TestData.RentTerms());

        Assert.True(result.IsSuccess);
        Assert.Equal(ListingKind.Rent, property.ListingKind);
        Assert.Null(property.SaleTerms);
        Assert.NotNull(property.RentTerms);
    }

    [Fact]
    public void Switching_a_listing_through_Update_drops_the_terms_of_the_old_kind()
    {
        var property = TestData.Property(ListingKind.Rent);

        var result = property.Update(
            title: "Now for sale", description: "…", typeId: Guid.NewGuid(),
            location: TestData.Location(), kind: ListingKind.Sale,
            sale: TestData.SaleTerms(), rent: null);

        Assert.True(result.IsSuccess);
        Assert.Null(property.RentTerms);
        Assert.NotNull(property.SaleTerms);
    }

    [Fact]
    public void A_sale_listing_without_sale_terms_is_refused()
    {
        var result = Domain.Entities.Property.Create(
            id: Guid.NewGuid(), title: "No terms", description: "…",
            typeId: Guid.NewGuid(), location: TestData.Location(),
            kind: ListingKind.Sale, sale: null, rent: null);

        Assert.True(result.IsError);
    }
}
