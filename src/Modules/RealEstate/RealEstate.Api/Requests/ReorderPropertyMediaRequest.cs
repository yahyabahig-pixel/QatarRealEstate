namespace RealEstate.Api.Requests;

// PUT body — every media id of this property, first to last. The first one becomes the cover.
public sealed record ReorderPropertyMediaRequest(IReadOnlyList<Guid> MediaIds);
