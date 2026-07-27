using Microsoft.AspNetCore.Mvc;
using RealEstate.Api.Errors;
using RealEstate.Api.Requests;
using RealEstate.Application.Properties.Admin.ArchiveProperty;
using RealEstate.Application.Properties.Admin.ChangePropertyPublicationStatus;
using RealEstate.Application.Properties.Admin.Command.AddPropertyMedia;
using RealEstate.Application.Properties.Admin.Command.CreateProperty;
using RealEstate.Application.Properties.Admin.Command.SetPropertyFeatures;
using RealEstate.Application.Properties.Admin.Command.SetPropertyOffer;
using RealEstate.Application.Properties.Admin.Command.UpdateProperty;
using RealEstate.Application.Properties.Admin.Queries.GetPropertyStatusHistory;
using RealEstate.Application.Properties.Admin.RemovePropertyMedia;

namespace RealEstate.Api.Controllers;

[Route("api/admin/properties")]
public sealed class AdminPropertiesController : ApiControllerBase
{
    // GET /api/admin/properties?status=Draft&isActive=true&page=1
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] ListPropertiesForAdminQuery query, CancellationToken ct)
        => (await Sender.Send(query, ct)).ToOk();

    // POST /api/admin/properties  → 201 + Location: /api/properties/{newId}
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePropertyCommand command, CancellationToken ct)
        => (await Sender.Send(command, ct))
            .ToCreatedAtRoute("GetPropertyDetails", id => new { id });

    // PUT /api/admin/properties/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePropertyRequest body, CancellationToken ct)
        => (await Sender.Send(new UpdatePropertyCommand(
                id, body.Title, body.Description, body.PropertyTypeId, body.ListingKind,
                body.Location, body.Sale, body.Rent, body.Specs), ct))
            .ToNoContent();

    // POST /api/admin/properties/{id}/media
    [HttpPost("{id:guid}/media")]
    public async Task<IActionResult> AddMedia(Guid id, [FromBody] AddPropertyMediaRequest body, CancellationToken ct)
        => (await Sender.Send(new AddPropertyMediaCommand(id, body.Items), ct)).ToNoContent();

    // DELETE /api/admin/properties/{id}/media/{mediaId}
    [HttpDelete("{id:guid}/media/{mediaId:guid}")]
    public async Task<IActionResult> RemoveMedia(Guid id, Guid mediaId, CancellationToken ct)
        => (await Sender.Send(new RemovePropertyMediaCommand(id, mediaId), ct)).ToNoContent();

    // PUT /api/admin/properties/{id}/features   — replaces the selection wholesale
    [HttpPut("{id:guid}/features")]
    public async Task<IActionResult> SetFeatures(Guid id, [FromBody] SetPropertyFeaturesRequest body, CancellationToken ct)
        => (await Sender.Send(new SetPropertyFeaturesCommand(id, body.Features), ct)).ToNoContent();

    // PUT /api/admin/properties/{id}/offer   — body { "offer": null } clears it
    [HttpPut("{id:guid}/offer")]
    public async Task<IActionResult> SetOffer(Guid id, [FromBody] SetPropertyOfferRequest body, CancellationToken ct)
        => (await Sender.Send(new SetPropertyOfferCommand(id, body.Offer), ct)).ToNoContent();

    // POST /api/admin/properties/{id}/publication   — { "action": "Publish" | "Unpublish" | "MarkSold" | "MarkRented" }
    [HttpPost("{id:guid}/publication")]
    public async Task<IActionResult> ChangePublication(
        Guid id, [FromBody] ChangePublicationStatusRequest body, CancellationToken ct)
        => (await Sender.Send(new ChangePropertyPublicationStatusCommand(id, body.Action, body.Reason), ct))
            .ToNoContent();

    // POST /api/admin/properties/{id}/archive
    [HttpPost("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
        => (await Sender.Send(new ArchivePropertyCommand(id), ct)).ToNoContent();

    // PUT /api/admin/properties/{id}/active   — { "isActive": true/false }
    [HttpPut("{id:guid}/active")]
    public async Task<IActionResult> ToggleActive(Guid id, [FromBody] TogglePropertyActiveRequest body, CancellationToken ct)
        => (await Sender.Send(new TogglePropertyActiveCommand(id, body.IsActive), ct)).ToNoContent();

    // GET /api/admin/properties/{id}/history
    [HttpGet("{id:guid}/history")]
    public async Task<IActionResult> StatusHistory(Guid id, CancellationToken ct)
        => (await Sender.Send(new GetPropertyStatusHistoryQuery(id), ct)).ToOk();
}