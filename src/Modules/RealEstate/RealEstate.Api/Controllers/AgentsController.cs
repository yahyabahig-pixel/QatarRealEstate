using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using RealEstate.Application.Agents.User.Queries.GetActiveAgents;
using RealEstate.Application.Agents.User.Queries.GetAgentBySlug;

namespace RealEstate.Api.Controllers;

// Public "Find an Agent" endpoints — anonymous, active agents only.
[Route("api/agents")]
public sealed class AgentsController : ApiControllerBase
{
    // GET /api/agents
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => (await Sender.Send(new GetActiveAgentsQuery(), ct)).ToOk();

    // GET /api/agents/{slug}   e.g. /api/agents/sara-el-amin
    [HttpGet("{slug}")]
    public async Task<IActionResult> BySlug(string slug, CancellationToken ct)
        => (await Sender.Send(new GetAgentBySlugQuery(slug), ct)).ToOk();
}
