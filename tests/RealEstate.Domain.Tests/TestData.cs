using RealEstate.Domain.Entities;
using RealEstate.Domain.Enums;
using RealEstate.Domain.ValueObjects;

namespace RealEstate.Domain.Tests;

/// <summary>
/// Builders for the value objects a Property needs, so a test that is about one rule does not
/// spend twenty lines constructing the other nineteen things first.
/// </summary>
internal static class TestData
{
    public static Location Location(string x = "51.5310", string y = "25.2854")
    {
        var result = ValueObjects.Location.Create(
            country: "Qatar", city: "Doha", street: "Test Street", postalCode: "00000",
            state: "Doha", xCoordinate: x, yCoordinate: y);

        Assert.True(result.IsSuccess, $"test fixture location was rejected: {Describe(result.Errors)}");
        return result.Value;
    }

    public static Money Money(decimal amount = 1_500_000m, string currency = "QAR")
    {
        var result = ValueObjects.Money.Create(amount, currency);
        Assert.True(result.IsSuccess, $"test fixture money was rejected: {Describe(result.Errors)}");
        return result.Value;
    }

    public static SaleTerms SaleTerms(decimal amount = 1_500_000m)
    {
        var result = ValueObjects.SaleTerms.Create(Money(amount), PaymentMethod.Cash);
        Assert.True(result.IsSuccess, $"test fixture sale terms were rejected: {Describe(result.Errors)}");
        return result.Value;
    }

    public static RentTerms RentTerms(decimal amount = 8_000m, int months = 12)
    {
        var result = ValueObjects.RentTerms.Create(Money(amount), months);
        Assert.True(result.IsSuccess, $"test fixture rent terms were rejected: {Describe(result.Errors)}");
        return result.Value;
    }

    /// <summary>A valid Property in Draft, of whichever listing kind the test needs.</summary>
    public static Property Property(ListingKind kind = ListingKind.Sale, string title = "A test listing")
    {
        var result = Entities.Property.Create(
            id: Guid.NewGuid(),
            title: title,
            description: "Created by the domain test suite.",
            typeId: Guid.NewGuid(),
            location: Location(),
            kind: kind,
            sale: kind == ListingKind.Sale ? SaleTerms() : null,
            rent: kind == ListingKind.Rent ? RentTerms() : null);

        Assert.True(result.IsSuccess, $"test fixture property was rejected: {Describe(result.Errors)}");
        return result.Value;
    }

    /// <summary>A published Property — the starting point for most status-rule tests.</summary>
    public static Property PublishedProperty(ListingKind kind = ListingKind.Sale)
    {
        var property = Property(kind);
        Assert.True(property.Publish().IsSuccess);
        return property;
    }

    public static Media Media(Guid propertyId, string url, int order, bool isPrimary)
    {
        var result = Entities.Media.Create(url, "Image", 1200, 800, order, isPrimary, propertyId);
        Assert.True(result.IsSuccess, $"test fixture media was rejected: {Describe(result.Errors)}");
        return result.Value;
    }

    public static string Describe(IEnumerable<BuildingBlocks.Domain.Common.Results.Errors.Error> errors) =>
        string.Join(", ", errors.Select(e => $"{e.Code}: {e.Description}"));
}
