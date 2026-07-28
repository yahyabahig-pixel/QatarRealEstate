using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using RealEstate.Application.Developments.User.Queries.GetDevelopmentBySlug;
using RealEstate.Application.Developments.User.Queries.GetDevelopments;

namespace RealEstate.Api.Controllers;

// Public "Developments" endpoints — anonymous.
[Route("api/developments")]
public sealed class DevelopmentsController : ApiControllerBase
{
    // GET /api/developments
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => (await Sender.Send(new GetDevelopmentsQuery(), ct)).ToOk();

    // GET /api/developments/{slug}   e.g. /api/developments/crescent-bay-residences
    [HttpGet("{slug}")]
    public async Task<IActionResult> BySlug(string slug, CancellationToken ct)
        => (await Sender.Send(new GetDevelopmentBySlugQuery(slug), ct)).ToOk();
}
