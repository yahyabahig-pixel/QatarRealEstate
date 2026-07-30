using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Leads.Admin.Command.ChangeLeadStatus;

public sealed record ChangeLeadStatusCommand(Guid Id, LeadStatus Status) : ICommand<Updated>;
