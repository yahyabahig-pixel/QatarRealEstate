

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using RealEstate.Application.Properties.User.Command.RecordPropertyView;
using RealEstate.Application.Properties.User.Queries.GetFeaturedProperties;
using RealEstate.Application.Properties.User.Queries.GetPropertiesForMap;
using RealEstate.Application.Properties.User.Queries.GetPropertyDetails;
using RealEstate.Application.Properties.User.Queries.GetRelatedProperties;
using RealEstate.Application.Properties.User.Queries.SearchProperties;

namespace RealEstate.Api.Controllers;


[Route("api/properties")]
public sealed class PropertiesController : ApiControllerBase
{
    // GET /api/properties?q=villa&listingKind=Sale&city=Doha&minRooms=3&sort=PriceAsc&page=1&pageSize=24
    // The record's constructor parameters bind 1:1 from the query string, defaults included.
    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] SearchPropertiesQuery query, CancellationToken ct)
        => (await Sender.Send(query, ct)).ToOk();

    // GET /api/properties/map?minLat=25.2&maxLat=25.5&minLng=51.4&maxLng=51.6&listingKind=Sale
    // Everything the split-view map needs for one viewport. Declared above the details route
    // for readability -- what actually stops "map" being swallowed is the :guid constraint on
    // that route, so the two can never collide.
    [HttpGet("map")]
    public async Task<IActionResult> Map([FromQuery] GetPropertiesForMapQuery query, CancellationToken ct)
        => (await Sender.Send(query, ct)).ToOk();

    // GET /api/properties/featured?take=8
    [HttpGet("featured")]
    public async Task<IActionResult> Featured([FromQuery] int take = 8, CancellationToken ct = default)
        => (await Sender.Send(new GetFeaturedPropertiesQuery(take), ct)).ToOk();

    // GET /api/properties/{id}
    // Name = the route the 201 from Create points back to.
    [HttpGet("{id:guid}", Name = "GetPropertyDetails")]
    public async Task<IActionResult> Details(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetPropertyDetailsQuery(id), ct)).ToOk();

    // GET /api/properties/{id}/related?take=4
    [HttpGet("{id:guid}/related")]
    public async Task<IActionResult> Related(Guid id, [FromQuery] int take = 4, CancellationToken ct = default)
        => (await Sender.Send(new GetRelatedPropertiesQuery(id, take), ct)).ToOk();

    // POST /api/properties/{id}/views  — fire-and-forget view counter, 204 always on success.
    //
    // Anonymous and it writes, so it is rate limited per address: the counter feeds the
    // "Most viewed" dashboard the team makes decisions from, and a loop in a browser tab
    // could otherwise put any listing at the top of it.
    [HttpPost("{id:guid}/views")]
    [EnableRateLimiting("public-write")]
    public async Task<IActionResult> RecordView(Guid id, CancellationToken ct)
        => (await Sender.Send(new RecordPropertyViewCommand(id), ct)).ToNoContent();
}