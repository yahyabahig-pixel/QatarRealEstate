using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Interfaces;

public interface IPropertyFeatureRepository
{
    // ---- Read Operations ----

    /// <summary>
    /// Gets a property feature by its unique identifier.
    /// </summary>
    Task<PropertyFeature?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Checks if a property feature exists with the given ID.
    /// </summary>
    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Gets all property features.
    /// </summary>
    Task<IEnumerable<PropertyFeature>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets all features for a specific property.
    /// </summary>
    Task<IEnumerable<PropertyFeature>> GetByPropertyIdAsync(int propertyId, CancellationToken ct = default);

    /// <summary>
    /// Gets all features with a specific feature ID.
    /// </summary>
    Task<IEnumerable<PropertyFeature>> GetByFeatureIdAsync(int featureId, CancellationToken ct = default);

    /// <summary>
    /// Gets features by feature name (e.g., "Bedrooms", "Bathrooms").
    /// </summary>
    Task<IEnumerable<PropertyFeature>> GetByFeatureNameAsync(string featureName, CancellationToken ct = default);

    /// <summary>
    /// Searches property features using a predicate.
    /// </summary>
    Task<IEnumerable<PropertyFeature>> FindAsync(Expression<Func<PropertyFeature, bool>> predicate, CancellationToken ct = default);

    /// <summary>
    /// Gets a single feature for a property by feature name.
    /// </summary>
    Task<PropertyFeature?> GetByPropertyIdAndFeatureNameAsync(int propertyId, string featureName, CancellationToken ct = default);

    /// <summary>
    /// Gets paginated property features with optional filtering.
    /// </summary>
    Task<(IEnumerable<PropertyFeature> Items, int TotalCount)> GetPaginatedAsync(
        int pageNumber,
        int pageSize,
        Expression<Func<PropertyFeature, bool>>? predicate = null,
        CancellationToken ct = default);

    // ---- Write Operations ----

    /// <summary>
    /// Adds a new property feature to the repository.
    /// </summary>
    Task<Result<PropertyFeature>> AddAsync(PropertyFeature propertyFeature, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing property feature.
    /// </summary>
    Task<Result<Updated>> UpdateAsync(PropertyFeature propertyFeature, CancellationToken ct = default);

    /// <summary>
    /// Removes a property feature from the repository.
    /// </summary>
    Task<Result<Deleted>> RemoveAsync(PropertyFeature propertyFeature, CancellationToken ct = default);

    /// <summary>
    /// Removes all features for a specific property.
    /// </summary>
    Task<Result<Deleted>> RemoveByPropertyIdAsync(int propertyId, CancellationToken ct = default);

    /// <summary>
    /// Removes multiple property features.
    /// </summary>
    Task<Result<Deleted>> RemoveRangeAsync(IEnumerable<PropertyFeature> propertyFeatures, CancellationToken ct = default);

    // ---- Batch Operations ----

    /// <summary>
    /// Adds multiple property features in a batch operation.
    /// </summary>
    Task<Result<int>> AddRangeAsync(IEnumerable<PropertyFeature> propertyFeatures, CancellationToken ct = default);

}
