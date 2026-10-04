namespace RealEstate.Domain.Tests;

/// <summary>
/// The admin form's reorder arrows had no effect and a new photo dragged to the front never
/// became the cover: the frontend synced media by URL, which cannot see a change of ORDER,
/// and the domain had no way to express one. ReorderMedia is that way.
/// </summary>
public class PropertyMediaOrderTests
{
    [Fact]
    public void Reordering_sets_both_the_order_and_the_cover_photo()
    {
        var property = TestData.Property();
        var a = TestData.Media(property.Id, "/api/media/images/a", 0, isPrimary: true);
        var b = TestData.Media(property.Id, "/api/media/images/b", 1, isPrimary: false);
        var c = TestData.Media(property.Id, "/api/media/images/c", 2, isPrimary: false);
        Assert.True(property.AddMedia(new[] { a, b, c }).IsSuccess);

        // The admin drags the third photo to the front.
        var result = property.ReorderMedia([c.Id, a.Id, b.Id]);

        Assert.True(result.IsSuccess, TestData.Describe(result.Errors));
        Assert.Equal(0, c.Order);
        Assert.Equal(1, a.Order);
        Assert.Equal(2, b.Order);

        // "First in the gallery" and "the cover photo" are one idea, not two facts that can
        // drift apart: exactly one primary, and it is the one at position zero.
        Assert.True(c.IsPrimary);
        Assert.False(a.IsPrimary);
        Assert.False(b.IsPrimary);
        Assert.Single(property.Media.Where(m => m.IsPrimary));
    }

    [Fact]
    public void A_partial_list_is_refused_rather_than_silently_dropping_photos()
    {
        var property = TestData.Property();
        var a = TestData.Media(property.Id, "/api/media/images/a", 0, true);
        var b = TestData.Media(property.Id, "/api/media/images/b", 1, false);
        Assert.True(property.AddMedia(new[] { a, b }).IsSuccess);

        var result = property.ReorderMedia([a.Id]);

        Assert.True(result.IsError);
        Assert.Equal("Property.Media.OrderInvalid", result.TopError.Code);
    }

    [Fact]
    public void A_repeated_id_is_refused()
    {
        var property = TestData.Property();
        var a = TestData.Media(property.Id, "/api/media/images/a", 0, true);
        var b = TestData.Media(property.Id, "/api/media/images/b", 1, false);
        Assert.True(property.AddMedia(new[] { a, b }).IsSuccess);

        var result = property.ReorderMedia([a.Id, a.Id]);

        Assert.True(result.IsError);
        Assert.Equal("Property.Media.OrderInvalid", result.TopError.Code);
    }

    [Fact]
    public void An_id_from_another_listing_is_refused()
    {
        var property = TestData.Property();
        var a = TestData.Media(property.Id, "/api/media/images/a", 0, true);
        Assert.True(property.AddMedia(new[] { a }).IsSuccess);

        var result = property.ReorderMedia([Guid.NewGuid()]);

        Assert.True(result.IsError);
    }

    [Fact]
    public void An_empty_list_is_refused()
    {
        var property = TestData.Property();
        var a = TestData.Media(property.Id, "/api/media/images/a", 0, true);
        Assert.True(property.AddMedia(new[] { a }).IsSuccess);

        Assert.True(property.ReorderMedia([]).IsError);
    }
}
