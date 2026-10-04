using RealEstate.Domain.Entities;
namespace RealEstate.Application.Abstractions.Persistence;

public interface IPropertyRepository
{
    Task<Property?> GetByIdAsync(Guid id, CancellationToken ct = default);

    // Loads the aggregate together with its owned Media collection (for media commands).
    Task<Property?> GetByIdWithMediaAsync(Guid id, CancellationToken ct = default);

    Task AddAsync(Property property, CancellationToken ct = default);

    Task<bool> PropertyTypeExistsAsync(Guid propertyTypeId, CancellationToken ct = default);
    //GetByIdWithFeaturesAsync
    Task<Property?> GetByIdWithFeaturesAsync(Guid id, CancellationToken ct = default);

    // Hard delete. Media, features and status history are configured Cascade; Leads keep
    // their loose PropertyId reference, so past inquiries survive as sales history.
    void Remove(Property property);

    /// <summary>
    /// Queues an audit row for the SAME SaveChanges as the status change that produced it.
    /// One transaction, so the trail can never disagree with the listing it describes.
    ///
    /// The commands used to carry a comment where this call belongs ("A status-history/audit
    /// trail can be recorded here if needed"), so the only writer was the seeder: every
    /// dashboard figure computed from the trail read zero, and the reason an admin typed when
    /// unpublishing was discarded.
    /// </summary>
    void RecordStatusChange(PropertyStatusHistory entry);
}