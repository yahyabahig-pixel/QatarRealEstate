using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstate.Application.Leads.Admin.Command.ChangeLeadStatus;
using RealEstate.Application.Leads.Admin.Command.DeleteLead;
using RealEstate.Application.Leads.Admin.Queries.GetLeadForAdmin;
using RealEstate.Application.Leads.Admin.Queries.ListLeadsForAdmin;
using RealEstate.Domain.Enums;

namespace RealEstate.Api.Controllers;

// Admin lead management. [Authorize] + the admin-access policy inside every handler.
// NOTE: no Lead.* entries exist in the seeded permission catalog yet — when they are
// added there, [HasPermission] attributes slot in here without other changes.
[Authorize]
[Route("api/admin/leads")]
public sealed class AdminLeadsController : ApiControllerBase
{
    // GET /api/admin/leads?q=&type=&status=&page=&pageSize=
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ListLeadsForAdminQuery query, CancellationToken ct)
        => (await Sender.Send(query, ct)).ToOk();

    // GET /api/admin/leads/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> ById(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetLeadForAdminQuery(id), ct)).ToOk();

    // PUT /api/admin/leads/{id}/status
    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] ChangeLeadStatusRequest body, CancellationToken ct)
        => (await Sender.Send(new ChangeLeadStatusCommand(id, body.Status), ct)).ToNoContent();

    // DELETE /api/admin/leads/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeleteLeadCommand(id), ct)).ToNoContent();
}

public sealed record ChangeLeadStatusRequest(LeadStatus Status);
