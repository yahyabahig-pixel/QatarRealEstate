using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Leads.Admin.Queries.GetLeadForAdmin;

public sealed record GetLeadForAdminQuery(Guid Id) : IQuery<LeadDetailsDto>;
