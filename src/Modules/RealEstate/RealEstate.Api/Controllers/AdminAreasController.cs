using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using RealEstate.Api.Requests;
using RealEstate.Application.Areas.Admin.Command.CreateArea;
using RealEstate.Application.Areas.Admin.Command.DeleteArea;
using RealEstate.Application.Areas.Admin.Command.UpdateArea;
using RealEstate.Application.Areas.Admin.Queries.GetAreaById;
using RealEstate.Application.Areas.User.Queries.GetAreas;

namespace RealEstate.Api.Controllers;

[Authorize]                       // first gate: must be a valid signed token
[Route("api/admin/areas")]
public sealed class AdminAreasController : ApiControllerBase
{
    // GET /api/admin/areas — same catalog as the public list (no draft concept),
    // behind Read permission so the admin UI has one consistent, authorized surface.
    [HttpGet]
    [HasPermission(AppPermissions.Area.Read)]
    public async Task<IActionResult> List(CancellationToken ct)
        => (await Sender.Send(new GetAreasQuery(), ct)).ToOk();

    // GET /api/admin/areas/{id}   — Name = the route the 201 from Create points back to
    [HttpGet("{id:guid}", Name = "GetAreaById")]
    [HasPermission(AppPermissions.Area.Read)]
    public async Task<IActionResult> ById(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetAreaByIdQuery(id), ct)).ToOk();

    // POST /api/admin/areas  → 201 + Location: /api/admin/areas/{newId}
    [HttpPost]
    [HasPermission(AppPermissions.Area.Create)]
    public async Task<IActionResult> Create([FromBody] CreateAreaCommand command, CancellationToken ct)
        => (await Sender.Send(command, ct))
            .ToCreatedAtRoute("GetAreaById", id => new { id });

    // PUT /api/admin/areas/{id}
    [HttpPut("{id:guid}")]
    [HasPermission(AppPermissions.Area.Update)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAreaRequest body, CancellationToken ct)
        => (await Sender.Send(new UpdateAreaCommand(id, body.Name, body.PhotoUrl, body.Slug, body.Intro), ct))
            .ToNoContent();

    // DELETE /api/admin/areas/{id} — 409 if any property is filed under this area
    [HttpDelete("{id:guid}")]
    [HasPermission(AppPermissions.Area.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeleteAreaCommand(id), ct)).ToNoContent();
}
