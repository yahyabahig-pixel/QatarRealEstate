using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using RealEstate.Api.Requests;
using RealEstate.Application.Developments.Admin.Command.CreateDevelopment;
using RealEstate.Application.Developments.Admin.Command.DeleteDevelopment;
using RealEstate.Application.Developments.Admin.Command.UpdateDevelopment;
using RealEstate.Application.Developments.Admin.Queries.GetDevelopmentById;
using RealEstate.Application.Developments.User.Queries.GetDevelopments;

namespace RealEstate.Api.Controllers;

[Authorize]                       // first gate: must be a valid signed token
[Route("api/admin/developments")]
public sealed class AdminDevelopmentsController : ApiControllerBase
{
    // GET /api/admin/developments — same catalog as the public list (no draft concept),
    // but behind Read permission so the admin UI has one consistent, authorized surface.
    [HttpGet]
    [HasPermission(AppPermissions.Development.Read)]
    public async Task<IActionResult> List(CancellationToken ct)
        => (await Sender.Send(new GetDevelopmentsQuery(), ct)).ToOk();

    // GET /api/admin/developments/{id}   — Name = the route the 201 from Create points back to
    [HttpGet("{id:guid}", Name = "GetDevelopmentById")]
    [HasPermission(AppPermissions.Development.Read)]
    public async Task<IActionResult> ById(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetDevelopmentByIdQuery(id), ct)).ToOk();

    // POST /api/admin/developments  → 201 + Location: /api/admin/developments/{newId}
    [HttpPost]
    [HasPermission(AppPermissions.Development.Create)]
    public async Task<IActionResult> Create([FromBody] CreateDevelopmentCommand command, CancellationToken ct)
        => (await Sender.Send(command, ct))
            .ToCreatedAtRoute("GetDevelopmentById", id => new { id });

    // PUT /api/admin/developments/{id}
    [HttpPut("{id:guid}")]
    [HasPermission(AppPermissions.Development.Update)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDevelopmentRequest body, CancellationToken ct)
        => (await Sender.Send(new UpdateDevelopmentCommand(
                id, body.Name, body.Location, body.DeliveryYear, body.CoverImageUrl,
                body.Slug, body.Description, body.UnitsCount, body.DeveloperName,
                body.StartingPrice, body.PaymentPlan), ct))
            .ToNoContent();

    // DELETE /api/admin/developments/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission(AppPermissions.Development.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeleteDevelopmentCommand(id), ct)).ToNoContent();
}
