using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using RealEstate.Api.Requests;
using RealEstate.Application.Features.Admin.Command.CreateFeature;
using RealEstate.Application.Features.Admin.Command.DeleteFeature;
using RealEstate.Application.Features.Admin.Command.ToggleFeatureActive;
using RealEstate.Application.Features.Admin.Command.UpdateFeature;
using RealEstate.Application.Features.Admin.Queries.ListFeaturesForAdmin;

namespace RealEstate.Api.Controllers;

// Feature (amenity) catalog management. The features managed here are exactly what the
// property form offers under "Property Features" — the public read side is
// GET /api/catalog/features (active only, anonymous).
[Authorize]                       // first gate: must be a valid signed token
[Route("api/admin/features")]
public sealed class AdminFeaturesController : ApiControllerBase
{
    // GET /api/admin/features   — includes DEACTIVATED features
    [HttpGet]
    [HasPermission(AppPermissions.Feature.Read)]
    public async Task<IActionResult> List(CancellationToken ct)
        => (await Sender.Send(new ListFeaturesForAdminQuery(), ct)).ToOk();

    // POST /api/admin/features   — { "name": "Swimming Pool", "valueType": "Boolean", "icon": null }
    [HttpPost]
    [HasPermission(AppPermissions.Feature.Create)]
    public async Task<IActionResult> Create([FromBody] CreateFeatureCommand command, CancellationToken ct)
        => (await Sender.Send(command, ct)).ToOk();

    // PUT /api/admin/features/{id}
    [HttpPut("{id:guid}")]
    [HasPermission(AppPermissions.Feature.Update)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateFeatureRequest body, CancellationToken ct)
        => (await Sender.Send(new UpdateFeatureCommand(id, body.Name, body.ValueType, body.Icon), ct))
            .ToNoContent();

    // PUT /api/admin/features/{id}/active   — { "isActive": true/false }
    [HttpPut("{id:guid}/active")]
    [HasPermission(AppPermissions.Feature.Update)]
    public async Task<IActionResult> ToggleActive(Guid id, [FromBody] ToggleFeatureActiveRequest body, CancellationToken ct)
        => (await Sender.Send(new ToggleFeatureActiveCommand(id, body.IsActive), ct)).ToNoContent();

    // DELETE /api/admin/features/{id}   — 409 Feature.InUse if any listing carries it
    [HttpDelete("{id:guid}")]
    [HasPermission(AppPermissions.Feature.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeleteFeatureCommand(id), ct)).ToNoContent();
}
