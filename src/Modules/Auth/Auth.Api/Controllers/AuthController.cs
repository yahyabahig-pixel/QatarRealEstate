using Auth.Application.Authentication.GetCurrentAdmin;
using Auth.Application.Authentication.Login;
using Auth.Contracts.Requests;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Auth.Api.Controllers;

[Route("api/auth")]
public sealed class AuthController : ApiControllerBase
{
    // POST /api/auth/login — the only anonymous endpoint in the module.
    //
    // Rate limited per client address. Identity locks an account for 5 minutes after 5 wrong
    // passwords, which protects the password — but it also means anyone who knows the main
    // admin's email address could send 5 deliberate failures every 5 minutes and keep that
    // account permanently locked out, for free. A limit on attempts per ADDRESS is what stops
    // the lockout being used as the attack.
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest body, CancellationToken ct)
        => (await Sender.Send(new LoginCommand(body.Email, body.Password), ct)).ToOk();

    // GET /api/auth/me — any authenticated admin; the frontend builds menus from this.
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
        => (await Sender.Send(new GetCurrentAdminQuery(), ct)).ToOk();
}
