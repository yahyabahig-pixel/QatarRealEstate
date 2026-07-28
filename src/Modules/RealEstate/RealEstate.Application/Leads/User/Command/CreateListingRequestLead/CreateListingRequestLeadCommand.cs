using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Properties.Admin.Command.CreateProperty.Inputs;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Leads.User.Command.CreateListingRequestLead;

// "List your property with us". Reuses the SAME LocationInput every other location-carrying
// command uses (X = longitude, Y = latitude). No Property is created here — the admin
// reviews the lead and decides.
public sealed record CreateListingRequestLeadCommand(
    string FullName,
    string Phone,
    string Email,
    string PropertyTypeName,
    ListingKind ListingKind,
    LocationInput Location,
    string? Message = null,
    string? Source = null) : ICommand<Guid>;
