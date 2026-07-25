using BuildingBlocks.Domain.Common.Results;

// View counting is high-frequency and contention-prone: keep it OUT of the aggregate.
// Infrastructure implements this as a cheap atomic UPDATE (or an append-only view log)
public interface IPropertyViewRecorder
{
    Task<Result<Updated>> RecordAsync(Guid propertyId, CancellationToken ct = default);

}