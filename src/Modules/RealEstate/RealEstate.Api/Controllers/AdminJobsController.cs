using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using RealEstate.Api.Requests;
using RealEstate.Application.Jobs.Admin.Command.CreateJob;
using RealEstate.Application.Jobs.Admin.Command.DeleteJob;
using RealEstate.Application.Jobs.Admin.Command.ToggleJobActive;
using RealEstate.Application.Jobs.Admin.Command.UpdateJob;
using RealEstate.Application.Jobs.Admin.Queries.GetJobById;
using RealEstate.Application.Jobs.Admin.Queries.ListJobsForAdmin;

namespace RealEstate.Api.Controllers;

[Authorize]                       // first gate: must be a valid signed token
[Route("api/admin/jobs")]
public sealed class AdminJobsController : ApiControllerBase
{
    // GET /api/admin/jobs   — includes CLOSED adverts, optionally filtered by department
    [HttpGet]
    [HasPermission(AppPermissions.Job.Read)]
    public async Task<IActionResult> List([FromQuery] string? department, CancellationToken ct)
        => (await Sender.Send(new ListJobsForAdminQuery(department), ct)).ToOk();

    // GET /api/admin/jobs/{id}   — Name = the route the 201 from Create points back to
    [HttpGet("{id:guid}", Name = "GetJobById")]
    [HasPermission(AppPermissions.Job.Read)]
    public async Task<IActionResult> ById(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetJobByIdQuery(id), ct)).ToOk();

    // POST /api/admin/jobs  → 201 + Location: /api/admin/jobs/{newId}
    [HttpPost]
    [HasPermission(AppPermissions.Job.Create)]
    public async Task<IActionResult> Create([FromBody] CreateJobCommand command, CancellationToken ct)
        => (await Sender.Send(command, ct))
            .ToCreatedAtRoute("GetJobById", id => new { id });

    // PUT /api/admin/jobs/{id}   — edits the advert text only, never its open/closed state
    [HttpPut("{id:guid}")]
    [HasPermission(AppPermissions.Job.Update)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateJobRequest body, CancellationToken ct)
        => (await Sender.Send(new UpdateJobCommand(
                id, body.Title, body.Department, body.EmploymentType,
                body.Location, body.Description), ct))
            .ToNoContent();

    // PUT /api/admin/jobs/{id}/active   — { "isActive": true/false }  (open / close the role)
    [HttpPut("{id:guid}/active")]
    [HasPermission(AppPermissions.Job.Update)]
    public async Task<IActionResult> ToggleActive(Guid id, [FromBody] ToggleJobActiveRequest body, CancellationToken ct)
        => (await Sender.Send(new ToggleJobActiveCommand(id, body.IsActive), ct)).ToNoContent();

    // DELETE /api/admin/jobs/{id}   — for adverts posted by mistake; closing is the normal path
    [HttpDelete("{id:guid}")]
    [HasPermission(AppPermissions.Job.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeleteJobCommand(id), ct)).ToNoContent();
}
