using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using RealEstate.Application.Jobs.User.Queries.GetJobDepartments;
using RealEstate.Application.Jobs.User.Queries.GetOpenJobs;

namespace RealEstate.Api.Controllers;

// Public Careers endpoints — anonymous, OPEN roles only. There is no GET /api/jobs/{id} here
// because the Careers page has no detail view: every advert is rendered inline as a card.
[Route("api/jobs")]
public sealed class JobsController : ApiControllerBase
{
    // GET /api/jobs              — every open role
    // GET /api/jobs?department=Sales  — one department's open roles
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? department, CancellationToken ct)
        => (await Sender.Send(new GetOpenJobsQuery(department), ct)).ToOk();

    // GET /api/jobs/departments  — ["Marketing","Operations","Sales","Technology"]
    // Lets the page build its filter chips from live data instead of a hard-coded array.
    [HttpGet("departments")]
    public async Task<IActionResult> Departments(CancellationToken ct)
        => (await Sender.Send(new GetJobDepartmentsQuery(), ct)).ToOk();
}
