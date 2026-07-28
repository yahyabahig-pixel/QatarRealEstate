using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Jobs.Admin.Command.ToggleJobActive;

// Closing a role is the normal end of its life — not deleting it. Next season the same advert
// is re-opened with one call instead of being retyped.
public sealed record ToggleJobActiveCommand(Guid Id, bool IsActive) : ICommand<Updated>;
