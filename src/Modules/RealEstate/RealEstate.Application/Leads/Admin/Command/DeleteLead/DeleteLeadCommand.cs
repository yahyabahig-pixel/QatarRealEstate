using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Leads.Admin.Command.DeleteLead;

// Hard delete IS appropriate for leads (unlike properties): spam and test submissions
// have no business value, and Archived status covers "keep but hide".
public sealed record DeleteLeadCommand(Guid Id) : ICommand<Updated>;
