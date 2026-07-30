using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using BuildingBlocks.Authorization;
using Microsoft.AspNetCore.Authorization;
using RealEstate.Application.Media.Admin.Command.DeleteImage;
using RealEstate.Application.Media.Admin.Command.UploadImage;
using RealEstate.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace RealEstate.Api.Controllers;

[Authorize]                       // first gate: must be a valid signed token
[Route("api/admin/media/images")]
public sealed class AdminImagesController : ApiControllerBase
{
    // POST /api/admin/media/images   (multipart/form-data, field name: "file")
    // → 201 + Location: /api/media/images/{newId} + body { "id": "..." }
    //
    // The admin flow: upload here first, take the returned URL, then use it as a property
    // media URL or an agent photo URL. External URLs (e.g. Unsplash) keep working too —
    // Media.Url / Agent.PhotoUrl are plain strings either way.
    [HttpPost]
    [HasPermission(AppPermissions.Media.Upload)]
    [RequestSizeLimit(StoredImage.MaxSizeBytes + 1024 * 1024)]   // multipart overhead headroom
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken ct)
    {
        // No file / empty file → run the empty command through the normal pipeline so the
        // caller gets the same RFC 9457 validation ProblemDetails as every other endpoint.
        if (file is null || file.Length == 0)
            return (await Sender.Send(new UploadImageCommand(
                file?.FileName ?? string.Empty, file?.ContentType ?? string.Empty, []), ct))
                .ToCreatedAtRoute("GetImageFile", id => new { id });

        await using var buffer = new MemoryStream((int)file.Length);
        await file.CopyToAsync(buffer, ct);

        return (await Sender.Send(
                new UploadImageCommand(file.FileName, file.ContentType, buffer.ToArray()), ct))
            .ToCreatedAtRoute("GetImageFile", id => new { id });
    }

    // DELETE /api/admin/media/images/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission(AppPermissions.Media.Delete)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
        => (await Sender.Send(new DeleteImageCommand(id), ct)).ToNoContent();
}
