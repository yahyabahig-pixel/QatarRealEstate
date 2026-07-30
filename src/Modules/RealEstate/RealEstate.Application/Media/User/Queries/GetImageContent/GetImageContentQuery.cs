using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Media.User.Queries.GetImageContent;

// Public — serves the actual bytes for <img src="/api/media/images/{id}">.
public sealed record GetImageContentQuery(Guid Id) : IQuery<StoredImageContentDto>;
