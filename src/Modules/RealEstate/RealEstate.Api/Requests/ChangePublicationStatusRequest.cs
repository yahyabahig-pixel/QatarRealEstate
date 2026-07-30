using RealEstate.Application.Properties.Admin.ChangePropertyPublicationStatus;

namespace RealEstate.Api.Requests;

public sealed record ChangePublicationStatusRequest(PublicationAction Action, string? Reason);