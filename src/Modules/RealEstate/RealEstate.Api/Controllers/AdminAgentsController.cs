using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using RealEstate.Api.Requests;
using RealEstate.Application.Agents.Admin.Command.CreateAgent;
using RealEstate.Application.Agents.Admin.Command.DeleteAgent;
using RealEstate.Application.Agents.Admin.Command.ToggleAgentActive;
using RealEstate.Application.Agents.Admin.Command.UpdateAgent;
using RealEstate.Application.Agents.Admin.Queries.GetAgentById;
using RealEstate.Application.Agents.Admin.Queries.ListAgentsForAdmin;

namespace RealEstate.Api.Controllers;

[Authorize]                       // first gate: must be a valid signed token
[Route("api/admin/agents")]
public sealed class AdminAgentsController : ApiControllerBase
{
    // GET /api/admin/agents   — includes deactivated agents
    [HttpGet]
    [HasPermission(AppPermissions.Agent.Read)]
    public async Task<IActionResult> List(CancellationToken ct)
        => (await Sender.Send(new ListAgentsForAdminQuery(), ct)).ToOk();

    // GET /api/admin/agents/{id}   — Name = the route the 201 from Create points back to
    [HttpGet("{id:guid}", Name = "GetAgentById")]
    [HasPermission(AppPermissions.Agent.Read)]
    public async Task<IActionResult> ById(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetAgentByIdQuery(id), ct)).ToOk();

    // POST /api/admin/agents  → 201 + Location: /api/admin/agents/{newId}
    [HttpPost]
    [HasPermission(AppPermissions.Agent.Create)]
    public async Task<IActionResult> Create([FromBody] CreateAgentCommand command, CancellationToken ct)
        => (await Sender.Send(command, ct))
            .ToCreatedAtRoute("GetAgentById", id => new { id });

    // PUT /api/admin/agents/{id}
    [HttpPut("{id:guid}")]
    [HasPermission(AppPermissions.Agent.Update)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAgentRequest body, CancellationToken ct)
        => (await Sender.Send(new UpdateAgentCommand(
                id, body.Name, body.JobTitle, body.PhotoUrl, body.Slug,
                body.Phone, body.WhatsApp, body.Email, body.Rating, body.Bio), ct))
            .ToNoContent();

    // PUT /api/admin/agents/{id}/active   — { "isActive": true/false }
    [HttpPut("{id:guid}/active")]
    [HasPermission(AppPermissions.Agent.Update)]
    public async Task<IActionResult> ToggleActive(Guid id, [FromBody] ToggleAgentActiveRequest body, CancellationToken ct)
        => (await Sender.Send(new ToggleAgentActiveCommand(id, body.IsActive), ct)).ToNoContent();

    // DELETE /api/admin/agents/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission(AppPermissions.Agent.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeleteAgentCommand(id), ct)).ToNoContent();
}
