using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Media.Admin.Command.UploadImage;

// Bytes arrive via the controller (IFormFile) — the application layer never sees ASP.NET types.
public sealed record UploadImageCommand(
    string FileName,
    string ContentType,
    byte[] Content) : ICommand<Guid>;
