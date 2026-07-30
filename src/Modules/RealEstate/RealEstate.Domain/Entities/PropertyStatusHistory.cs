using BuildingBlocks.Domain.Common;
using RealEstate.Domain.Enums;
namespace RealEstate.Domain.Entities;

public sealed class PropertyStatusHistory : AuditableEntity
{
    public Guid PropertyId { get; private set; }
    public PropertyStatus? OldStatus { get; private set; }
    public PropertyStatus NewStatus { get; private set; }
    public string? Reason { get; private set; }

    private PropertyStatusHistory() { }

    public static PropertyStatusHistory Record(Guid propertyId, PropertyStatus? oldStatus,
                                               PropertyStatus newStatus, string? reason = null)
        => new()
        {
            PropertyId = propertyId,
            OldStatus = oldStatus,
            NewStatus = newStatus,
            Reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim()
        };
}