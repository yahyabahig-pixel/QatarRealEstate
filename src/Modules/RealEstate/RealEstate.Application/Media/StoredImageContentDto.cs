namespace RealEstate.Application.Media;

// What the serving endpoint needs — bytes + the headers to send with them.
public sealed record StoredImageContentDto(byte[] Content, string ContentType, string FileName);
