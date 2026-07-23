using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Interfaces;

public interface IPropertyTypeRepository
{
    // ---- Read Operations ----

    /// <summary>
    /// Gets a property type by its unique identifier.
    /// </summary>
    Task<PropertyType?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Checks if a property type exists with the given ID.
    /// </summary>
    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Gets all property types.
    /// </summary>
    Task<IEnumerable<PropertyType>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets a property type by name.
    /// </summary>
    Task<PropertyType?> GetByNameAsync(string name, CancellationToken ct = default);

    /// <summary>
    /// Checks if a property type name already exists.
    /// </summary>
    Task<bool> ExistsByNameAsync(string name, CancellationToken ct = default);

    /// <summary>
    /// Searches property types using a predicate.
    /// </summary>
    Task<IEnumerable<PropertyType>> FindAsync(Expression<Func<PropertyType, bool>> predicate, CancellationToken ct = default);

    /// <summary>
    /// Gets paginated property types with optional filtering.
    /// </summary>
    Task<(IEnumerable<PropertyType> Items, int TotalCount)> GetPaginatedAsync(
        int pageNumber,
        int pageSize,
        Expression<Func<PropertyType, bool>>? predicate = null,
        CancellationToken ct = default);

    // ---- Write Operations ----

    /// <summary>
    /// Adds a new property type to the repository.
    /// </summary>
    Task<Result<PropertyType>> AddAsync(PropertyType propertyType, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing property type.
    /// </summary>
    Task<Result<Updated>> UpdateAsync(PropertyType propertyType, CancellationToken ct = default);

    /// <summary>
    /// Removes a property type from the repository.
    /// </summary>
    Task<Result<Deleted>> RemoveAsync(PropertyType propertyType, CancellationToken ct = default);

    /// <summary>
    /// Removes multiple property types.
    /// </summary>
    Task<Result<Deleted>> RemoveRangeAsync(IEnumerable<PropertyType> propertyTypes, CancellationToken ct = default);

    // ---- Batch Operations ----

    /// <summary>
    /// Adds multiple property types in a batch operation.
    /// </summary>
    Task<Result<int>> AddRangeAsync(IEnumerable<PropertyType> propertyTypes, CancellationToken ct = default);

    /// <summary>
    /// Saves all pending changes to the repository.
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
