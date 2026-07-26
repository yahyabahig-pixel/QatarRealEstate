namespace BuildingBlocks.Domain.Common;

public abstract class AuditableEntity : Entity
{
    protected AuditableEntity()
    { }

    protected AuditableEntity(Guid id)
        : base(id)
    {
    }

    public DateTimeOffset CreatedAtUtc { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTimeOffset LastModifiedUtc { get; set; }

    public Guid? LastModifiedBy { get; set; }
}