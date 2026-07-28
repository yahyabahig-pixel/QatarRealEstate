using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Features.Admin.Command.CreateFeature;

// ValueType: Boolean = presence only ("Swimming Pool"), Text/Number = carries a value
// ("Floor type" = "Marble", "Parking" = "3"). Arrives as a string thanks to the
// JsonStringEnumConverter registered in RealEstate.Api.
public sealed record CreateFeatureCommand(
    string Name,
    FeatureValueType ValueType = FeatureValueType.Boolean,
    string? Icon = null) : ICommand<Guid>;
