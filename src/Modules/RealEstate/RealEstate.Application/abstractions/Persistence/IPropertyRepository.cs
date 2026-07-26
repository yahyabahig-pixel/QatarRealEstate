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

}