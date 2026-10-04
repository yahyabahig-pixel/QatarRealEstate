using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RealEstate.Application.Leads.Admin.Command.ChangeLeadStatus;
using RealEstate.Application.Leads.Admin.Command.DeleteLead;
using RealEstate.Application.Leads.Admin.Queries.GetLeadForAdmin;
using RealEstate.Application.Leads.Admin.Queries.ListLeadsForAdmin;
using RealEstate.Domain.Enums;

namespace RealEstate.Api.Controllers;

// Admin lead management.
//
// Every action carries a Lead.* permission. It used to carry [Authorize] alone, with the only
// check inside the handlers being "does this token have the Admin role?" — and CreateAdminAsync
// gives that role to EVERY admin account it creates. So an account made to post job adverts
// could read every customer's name, phone number and email address, and delete them for good.
// Reading customer contact details and being able to log in are not the same authority.
[Authorize]
[Route("api/admin/leads")]
public sealed class AdminLeadsController : ApiControllerBase
{
    // GET /api/admin/leads?q=&type=&status=&page=&pageSize=
    [HttpGet]
    [HasPermission(AppPermissions.Lead.Read)]
    public async Task<IActionResult> List([FromQuery] ListLeadsForAdminQuery query, CancellationToken ct)
        => (await Sender.Send(query, ct)).ToOk();

    // GET /api/admin/leads/{id}
    [HttpGet("{id:guid}")]
    [HasPermission(AppPermissions.Lead.Read)]
    public async Task<IActionResult> ById(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetLeadForAdminQuery(id), ct)).ToOk();

    // PUT /api/admin/leads/{id}/status — working the pipeline, not reading it.
    [HttpPut("{id:guid}/status")]
    [HasPermission(AppPermissions.Lead.Update)]
    public async Task<IActionResult> ChangeStatus(Guid id, [FromBody] ChangeLeadStatusRequest body, CancellationToken ct)
        => (await Sender.Send(new ChangeLeadStatusCommand(id, body.Status), ct)).ToNoContent();

    // DELETE /api/admin/leads/{id} — permanent, hence its own permission.
    [HttpDelete("{id:guid}")]
    [HasPermission(AppPermissions.Lead.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeleteLeadCommand(id), ct)).ToNoContent();
}

public sealed record ChangeLeadStatusRequest(LeadStatus Status);
