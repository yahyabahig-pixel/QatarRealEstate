using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using RealEstate.Application.Areas.User.Queries.GetAreaBySlug;
using RealEstate.Application.Areas.User.Queries.GetAreas;

namespace RealEstate.Api.Controllers;

// Public "Areas" endpoints — anonymous. Every DTO carries the computed live-listing count.
[Route("api/areas")]
public sealed class AreasController : ApiControllerBase
{
    // GET /api/areas
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => (await Sender.Send(new GetAreasQuery(), ct)).ToOk();

    // GET /api/areas/{slug}   e.g. /api/areas/the-pearl
    [HttpGet("{slug}")]
    public async Task<IActionResult> BySlug(string slug, CancellationToken ct)
        => (await Sender.Send(new GetAreaBySlugQuery(slug), ct)).ToOk();
}
