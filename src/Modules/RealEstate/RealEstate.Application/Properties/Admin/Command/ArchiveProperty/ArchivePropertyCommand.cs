using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
namespace RealEstate.Application.Properties.Admin.ArchiveProperty;

// Reason is optional and trailing, so the existing positional construction in
// AdminPropertiesController keeps compiling. It exists so archiving can say WHY in the audit
// trail, exactly like every other status change.
public sealed record ArchivePropertyCommand(Guid Id, string? Reason = null) : ICommand<Updated>;
