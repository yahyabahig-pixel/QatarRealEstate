using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Jobs.Admin.Command.UpdateJob;

// IsActive is deliberately absent: opening and closing an advert is a separate, single-purpose
// endpoint (PUT {id}/active), so an admin fixing a typo can never accidentally close a role.
public sealed record UpdateJobCommand(
    Guid Id,
    string Title,
    string Department,
    string EmploymentType,
    string Location,
    string Description) : ICommand<Updated>;
