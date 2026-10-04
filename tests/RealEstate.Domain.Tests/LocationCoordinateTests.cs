using RealEstate.Domain.ValueObjects;

namespace RealEstate.Domain.Tests;

/// <summary>
/// Coordinates used to be CHECKED one way and CONVERTED another. The check accepted a comma
/// as a thousands separator and had no range at all; the conversion that ran afterwards was
/// strict. So "51,5310" passed validation, failed conversion, and the listing was saved with
/// no coordinates — invisible on the map, with no error shown to anyone.
///
/// One parser now does both, with the real ranges.
/// </summary>
public class LocationCoordinateTests
{
    private static BuildingBlocks.Domain.Common.Results.Result<Location> Create(string x, string y) =>
        Location.Create("Qatar", "Doha", "Street", "00000", "Doha", x, y);

    [Theory]
    [InlineData("51.5310", "25.2854")]   // Doha
    [InlineData("-0.1276", "51.5072")]   // London — negative longitude
    [InlineData("0", "0")]               // the null island is a real coordinate
    [InlineData("180", "90")]            // the exact edges are valid
    [InlineData("-180", "-90")]
    public void Valid_coordinates_are_accepted(string x, string y)
    {
        var result = Create(x, y);
        Assert.True(result.IsSuccess, TestData.Describe(result.Errors));
    }

    [Theory]
    // The original bug: a comma passed the check and then failed the conversion.
    [InlineData("51,5310", "25.2854")]
    [InlineData("51.5310", "25,2854")]
    // Out of range in every direction.
    [InlineData("181", "25.2854")]
    [InlineData("-181", "25.2854")]
    [InlineData("51.5310", "91")]
    [InlineData("51.5310", "-91")]
    // Not numbers at all.
    [InlineData("abc", "25.2854")]
    [InlineData("", "25.2854")]
    [InlineData("51.5310", "")]
    [InlineData("NaN", "25.2854")]
    [InlineData("Infinity", "25.2854")]
    [InlineData("51.53.10", "25.2854")]
    public void Invalid_coordinates_are_refused(string x, string y)
    {
        var result = Create(x, y);
        Assert.True(result.IsError, $"'{x}','{y}' was accepted but should not have been.");
    }

    [Fact]
    public void A_decimal_point_is_read_the_same_way_in_every_locale()
    {
        // The parser is pinned to InvariantCulture. Without that, a server whose locale uses
        // a comma for decimals reads "51.5310" as 515310 — an accepted number, wildly out of
        // range — and the failure depends on where the container happens to be running.
        var previous = Thread.CurrentThread.CurrentCulture;
        try
        {
            Thread.CurrentThread.CurrentCulture = new System.Globalization.CultureInfo("de-DE");

            Assert.True(Location.TryParseCoordinate("51.5310", -180, 180, out var parsed));
            Assert.Equal(51.531, parsed, precision: 4);

            Assert.False(Location.TryParseCoordinate("51,5310", -180, 180, out _));
        }
        finally
        {
            Thread.CurrentThread.CurrentCulture = previous;
        }
    }
}
