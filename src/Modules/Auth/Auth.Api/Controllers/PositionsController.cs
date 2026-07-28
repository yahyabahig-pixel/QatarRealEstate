using Auth.Application.Positions.AssignPermission;
using Auth.Application.Positions.CreatePosition;
using Auth.Application.Positions.DeletePosition;
using Auth.Application.Positions.GetPosition;
using Auth.Application.Positions.ListPositions;
using Auth.Application.Positions.RemovePermission;
using Auth.Application.Positions.UpdatePosition;
using Auth.Contracts.Requests;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Auth.Api.Controllers;

[Authorize]
[Route("api/positions")]
public sealed class PositionsController : ApiControllerBase
{
    [HttpGet]
    [HasPermission(AppPermissions.Position.Read)]
    public async Task<IActionResult> List(CancellationToken ct)
        => (await Sender.Send(new ListPositionsQuery(), ct)).ToOk();

    [HttpGet("{id:guid}", Name = "GetPositionById")]
    [HasPermission(AppPermissions.Position.Read)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetPositionQuery(id), ct)).ToOk();

    [HttpPost]
    [HasPermission(AppPermissions.Position.Create)]
    public async Task<IActionResult> Create([FromBody] CreatePositionRequest body, CancellationToken ct)
        => (await Sender.Send(new CreatePositionCommand(body.Name, body.Description), ct))
            .ToCreatedAtRoute("GetPositionById", id => new { id });

    [HttpPut("{id:guid}")]
    [HasPermission(AppPermissions.Position.Update)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePositionRequest body, CancellationToken ct)
        => (await Sender.Send(new UpdatePositionCommand(id, body.Name, body.Description), ct)).ToNoContent();

    [HttpDelete("{id:guid}")]
    [HasPermission(AppPermissions.Position.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeletePositionCommand(id), ct)).ToNoContent();

    // ---- the position's permission set ------------------------------------------------

    // POST /api/positions/{id}/permissions   { "permission": "Property.Publish" }
    [HttpPost("{id:guid}/permissions")]
    [HasPermission(AppPermissions.Permission.Assign)]
    public async Task<IActionResult> AssignPermission(Guid id, [FromBody] AssignPermissionRequest body, CancellationToken ct)
        => (await Sender.Send(new AssignPermissionCommand(id, body.Permission), ct)).ToNoContent();

    // DELETE /api/positions/{id}/permissions/{permission}
    [HttpDelete("{id:guid}/permissions/{permission}")]
    [HasPermission(AppPermissions.Permission.Assign)]
    public async Task<IActionResult> RemovePermission(Guid id, string permission, CancellationToken ct)
        => (await Sender.Send(new RemovePermissionCommand(id, permission), ct)).ToNoContent();
}
