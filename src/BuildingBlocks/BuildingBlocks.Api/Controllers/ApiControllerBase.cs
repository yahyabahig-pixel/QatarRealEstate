using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace BuildingBlocks.Api.Controllers;

// Shared by every module's controllers. Promoted from RealEstate.Api the day a second
// module (Auth) needed it — the modular-monolith rule: modules never reference each other,
// shared plumbing sinks into BuildingBlocks.
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    private ISender? _sender;

    protected ISender Sender =>
        _sender ??= HttpContext.RequestServices.GetRequiredService<ISender>();
}
