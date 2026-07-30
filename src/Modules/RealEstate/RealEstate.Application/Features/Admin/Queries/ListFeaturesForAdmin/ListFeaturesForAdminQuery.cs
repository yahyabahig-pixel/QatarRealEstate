using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Features.Admin.Queries.ListFeaturesForAdmin;

public sealed record ListFeaturesForAdminQuery : IQuery<IReadOnlyList<FeatureAdminDto>>;
