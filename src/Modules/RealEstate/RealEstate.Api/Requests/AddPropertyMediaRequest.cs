using RealEstate.Application.Properties.Admin.Command.AddPropertyMedia;

namespace RealEstate.Api.Requests;

public sealed record AddPropertyMediaRequest(IReadOnlyList<MediaInput> Items);