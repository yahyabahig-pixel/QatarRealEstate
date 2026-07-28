using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using RealEstate.Application.Media.User.Queries.GetImageContent;

namespace RealEstate.Api.Controllers;

// Public image serving — this is what <img src="..."> on the site points at.
[Route("api/media/images")]
public sealed class ImagesController : ApiControllerBase
{
    // GET /api/media/images/{id}
    //
    // Images are immutable (replacing a photo = a new upload with a NEW id), so the browser
    // may cache each one forever: no re-downloads, no revalidation requests. This is what
    // keeps serve-from-database cheap at this deployment's scale.
    [HttpGet("{id:guid}", Name = "GetImageFile")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        var result = await Sender.Send(new GetImageContentQuery(id), ct);
        if (result.IsError) return result.Errors.ToProblem();

        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(result.Value.Content, result.Value.ContentType);
    }
}
