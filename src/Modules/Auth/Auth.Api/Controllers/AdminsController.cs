using Auth.Application.Admins.ActivateAdmin;
using Auth.Application.Admins.AssignPosition;
using Auth.Application.Admins.CreateAdmin;
using Auth.Application.Admins.DeactivateAdmin;
using Auth.Application.Admins.DeleteAdmin;
using Auth.Application.Admins.GetAdmin;
using Auth.Application.Admins.ListAdmins;
using Auth.Application.Admins.RemovePosition;
using Auth.Application.Admins.UpdateAdmin;
using Auth.Contracts.Requests;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Auth.Api.Controllers;

[Authorize]
[Route("api/admins")]
public sealed class AdminsController : ApiControllerBase
{
    // GET /api/admins?q=ali&isActive=true&page=1
    [HttpGet]
    [HasPermission(AppPermissions.Admin.Read)]
    public async Task<IActionResult> List([FromQuery] ListAdminsQuery query, CancellationToken ct)
        => (await Sender.Send(query, ct)).ToOk();

    [HttpGet("{id:guid}", Name = "GetAdminById")]
    [HasPermission(AppPermissions.Admin.Read)]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetAdminQuery(id), ct)).ToOk();

    // POST /api/admins — always creates a REGULAR admin; no field can say otherwise.
    [HttpPost]
    [HasPermission(AppPermissions.Admin.Create)]
    public async Task<IActionResult> Create([FromBody] CreateAdminRequest body, CancellationToken ct)
        => (await Sender.Send(new CreateAdminCommand(body.Email, body.Password, body.FullName, body.PositionId), ct))
            .ToCreatedAtRoute("GetAdminById", id => new { id });

    [HttpPut("{id:guid}")]
    [HasPermission(AppPermissions.Admin.Update)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAdminRequest body, CancellationToken ct)
        => (await Sender.Send(new UpdateAdminCommand(id, body.FullName), ct)).ToNoContent();

    // Deactivate / activate — the everyday on/off switch (soft, reversible).
    [HttpPost("{id:guid}/deactivate")]
    [HasPermission(AppPermissions.Admin.Update)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeactivateAdminCommand(id), ct)).ToNoContent();

    [HttpPost("{id:guid}/activate")]
    [HasPermission(AppPermissions.Admin.Update)]
    public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
        => (await Sender.Send(new ActivateAdminCommand(id), ct)).ToNoContent();

    // DELETE — hard delete. Admin.Delete is in no seeded position: Main-Admin territory.
    [HttpDelete("{id:guid}")]
    [HasPermission(AppPermissions.Admin.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeleteAdminCommand(id), ct)).ToNoContent();

    // POST /api/admins/{id}/position  { "positionId": "..." }
    [HttpPost("{id:guid}/position")]
    [HasPermission(AppPermissions.Admin.AssignPosition)]
    public async Task<IActionResult> AssignPosition(Guid id, [FromBody] AssignPositionRequest body, CancellationToken ct)
        => (await Sender.Send(new AssignPositionCommand(id, body.PositionId), ct)).ToNoContent();

    [HttpDelete("{id:guid}/position")]
    [HasPermission(AppPermissions.Admin.AssignPosition)]
    public async Task<IActionResult> RemovePosition(Guid id, CancellationToken ct)
        => (await Sender.Send(new RemovePositionCommand(id), ct)).ToNoContent();
}
