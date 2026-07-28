using Auth.Application.Authentication.GetCurrentAdmin;
using Auth.Application.Authentication.Login;
using Auth.Contracts.Requests;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Auth.Api.Controllers;

[Route("api/auth")]
public sealed class AuthController : ApiControllerBase
{
    // POST /api/auth/login — the only anonymous endpoint in the module.
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest body, CancellationToken ct)
        => (await Sender.Send(new LoginCommand(body.Email, body.Password), ct)).ToOk();

    // GET /api/auth/me — any authenticated admin; the frontend builds menus from this.
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
        => (await Sender.Send(new GetCurrentAdminQuery(), ct)).ToOk();
}
