using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using BuildingBlocks.Api.Errors;
using RealEstate.Api.Requests;
using RealEstate.Application.Properties.Admin.ArchiveProperty;
using RealEstate.Application.Properties.Admin.ChangePropertyPublicationStatus;
using RealEstate.Application.Properties.Admin.Command.AddPropertyMedia;
using RealEstate.Application.Properties.Admin.Command.CreateProperty;
using RealEstate.Application.Properties.Admin.Command.DeleteProperty;
using RealEstate.Application.Properties.Admin.Command.SetPropertyFeatured;
using RealEstate.Application.Properties.Admin.Command.SetPropertyFeatures;
using RealEstate.Application.Properties.Admin.Command.SetPropertyOffer;
using RealEstate.Application.Properties.Admin.Command.UpdateProperty;
using RealEstate.Application.Properties.Admin.Queries.GetDashboardStatistics;
using RealEstate.Application.Properties.Admin.Queries.GetMostViewedProperties;
using RealEstate.Application.Properties.Admin.Queries.GetPropertyStatusHistory;
using RealEstate.Application.Properties.Admin.RemovePropertyMedia;

namespace RealEstate.Api.Controllers;

[Authorize]                       // first gate: must be a valid signed token
[Route("api/admin/properties")]
public sealed class AdminPropertiesController : ApiControllerBase
{
    // GET /api/admin/properties?status=Draft&isActive=true&page=1
    [HttpGet]
    [HasPermission(AppPermissions.Property.Read)]
    public async Task<IActionResult> List([FromQuery] ListPropertiesForAdminQuery query, CancellationToken ct)
        => (await Sender.Send(query, ct)).ToOk();

    // GET /api/admin/properties/dashboard-statistics?year=2026 — 12 zero-filled months of
    // real monthly activity (new listings + status-change events), grouped in the database.
    [HttpGet("dashboard-statistics")]
    [HasPermission(AppPermissions.Property.Read)]
    public async Task<IActionResult> DashboardStatistics([FromQuery] GetDashboardStatisticsQuery query, CancellationToken ct)
        => (await Sender.Send(query, ct)).ToOk();

    // GET /api/admin/properties/most-viewed?take=5 — dashboard analytics: top listings by
    // the aggregate view counter, plus the portfolio's total views. Admin-only; an Agent
    // gets the analytics of their own listings (same scoping as the list above).
    [HttpGet("most-viewed")]
    [HasPermission(AppPermissions.Property.Read)]
    public async Task<IActionResult> MostViewed([FromQuery] GetMostViewedPropertiesQuery query, CancellationToken ct)
        => (await Sender.Send(query, ct)).ToOk();

    // POST /api/admin/properties  → 201 + Location: /api/properties/{newId}
    [HttpPost]
    [HasPermission(AppPermissions.Property.Create)]
    public async Task<IActionResult> Create([FromBody] CreatePropertyCommand command, CancellationToken ct)
        => (await Sender.Send(command, ct))
            .ToCreatedAtRoute("GetPropertyDetails", id => new { id });

    // PUT /api/admin/properties/{id}
    [HttpPut("{id:guid}")]
    [HasPermission(AppPermissions.Property.Update)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePropertyRequest body, CancellationToken ct)
        => (await Sender.Send(new UpdatePropertyCommand(
                id, body.Title, body.Description, body.PropertyTypeId, body.ListingKind,
                body.Location, body.Sale, body.Rent, body.Specs, body.AreaId, body.AgentId,
                body.IsOffPlan, body.PriceOnRequest), ct))
            .ToNoContent();

    // POST /api/admin/properties/{id}/media
    [HttpPost("{id:guid}/media")]
    [HasPermission(AppPermissions.Property.Update)]
    public async Task<IActionResult> AddMedia(Guid id, [FromBody] AddPropertyMediaRequest body, CancellationToken ct)
        => (await Sender.Send(new AddPropertyMediaCommand(id, body.Items), ct)).ToNoContent();

    // DELETE /api/admin/properties/{id}/media/{mediaId}
    [HttpDelete("{id:guid}/media/{mediaId:guid}")]
    [HasPermission(AppPermissions.Property.Update)]
    public async Task<IActionResult> RemoveMedia(Guid id, Guid mediaId, CancellationToken ct)
        => (await Sender.Send(new RemovePropertyMediaCommand(id, mediaId), ct)).ToNoContent();

    // PUT /api/admin/properties/{id}/features   — replaces the selection wholesale
    [HttpPut("{id:guid}/features")]
    [HasPermission(AppPermissions.Property.Update)]
    public async Task<IActionResult> SetFeatures(Guid id, [FromBody] SetPropertyFeaturesRequest body, CancellationToken ct)
        => (await Sender.Send(new SetPropertyFeaturesCommand(id, body.Features), ct)).ToNoContent();

    // PUT /api/admin/properties/{id}/offer   — body { "offer": null } clears it
    [HttpPut("{id:guid}/offer")]
    [HasPermission(AppPermissions.Property.Update)]
    public async Task<IActionResult> SetOffer(Guid id, [FromBody] SetPropertyOfferRequest body, CancellationToken ct)
        => (await Sender.Send(new SetPropertyOfferCommand(id, body.Offer), ct)).ToNoContent();

    // POST /api/admin/properties/{id}/publication   — { "action": "Publish" | "Unpublish" | "MarkSold" | "MarkRented" }
    [HttpPost("{id:guid}/publication")]
    [HasPermission(AppPermissions.Property.Publish)]
    public async Task<IActionResult> ChangePublication(
        Guid id, [FromBody] ChangePublicationStatusRequest body, CancellationToken ct)
        => (await Sender.Send(new ChangePropertyPublicationStatusCommand(id, body.Action, body.Reason), ct))
            .ToNoContent();

    // PUT /api/admin/properties/{id}/featured   — { "isFeatured": true/false }
    // "Exclusive" in the admin UI. Editorial promotion, so it shares the Publish
    // permission; the domain only lets a PUBLISHED listing be featured (409 otherwise).
    [HttpPut("{id:guid}/featured")]
    [HasPermission(AppPermissions.Property.Publish)]
    public async Task<IActionResult> SetFeatured(Guid id, [FromBody] SetPropertyFeaturedRequest body, CancellationToken ct)
        => (await Sender.Send(new SetPropertyFeaturedCommand(id, body.IsFeatured), ct)).ToNoContent();

    // POST /api/admin/properties/{id}/archive
    [HttpPost("{id:guid}/archive")]
    [HasPermission(AppPermissions.Property.Publish)]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
        => (await Sender.Send(new ArchivePropertyCommand(id), ct)).ToNoContent();

    // DELETE /api/admin/properties/{id} -- PERMANENT removal (media, features and status
    // history cascade with it). Archive above stays the reversible alternative.
    [HttpDelete("{id:guid}")]
    [HasPermission(AppPermissions.Property.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeletePropertyCommand(id), ct)).ToNoContent();

    // PUT /api/admin/properties/{id}/active   — { "isActive": true/false }
    [HttpPut("{id:guid}/active")]
    [HasPermission(AppPermissions.Property.Update)]
    public async Task<IActionResult> ToggleActive(Guid id, [FromBody] TogglePropertyActiveRequest body, CancellationToken ct)
        => (await Sender.Send(new TogglePropertyActiveCommand(id, body.IsActive), ct)).ToNoContent();

    // GET /api/admin/properties/{id}/history
    [HttpGet("{id:guid}/history")]
    [HasPermission(AppPermissions.Property.Read)]
    public async Task<IActionResult> StatusHistory(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetPropertyStatusHistoryQuery(id), ct)).ToOk();
}