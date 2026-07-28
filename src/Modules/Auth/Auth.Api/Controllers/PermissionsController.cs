using Auth.Application.Permissions.ListPermissions;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Auth.Api.Controllers;

[Authorize]
[Route("api/permissions")]
public sealed class PermissionsController : ApiControllerBase
{
    // GET /api/permissions — the full catalog (for the admin UI's checkboxes).
    [HttpGet]
    [HasPermission(AppPermissions.Permission.Read)]
    public async Task<IActionResult> List(CancellationToken ct)
        => (await Sender.Send(new ListPermissionsQuery(), ct)).ToOk();
}
