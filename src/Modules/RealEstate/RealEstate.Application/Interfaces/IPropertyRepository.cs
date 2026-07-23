using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Domain.Entities;
using RealEstate.Domain.Enums;

namespace RealEstate.Application.Interfaces;

public interface IPropertyRepository
{
    // ---- Read Operations ----

    /// <summary>
    /// Gets a property by its unique identifier.
    /// </summary>
    Task<Property?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Checks if a property exists with the given ID.
    /// </summary>
    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Gets all properties with optional filtering.
    /// </summary>
    Task<IEnumerable<Property>> GetAllAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets properties by their status (Published, Draft, Archived, etc.).
    /// </summary>
    Task<IEnumerable<Property>> GetByStatusAsync(PropertyStatus status, CancellationToken ct = default);

    /// <summary>
    /// Gets published/available properties.
    /// </summary>
    Task<IEnumerable<Property>> GetAvailablePropertiesAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets properties by type ID.
    /// </summary>
    Task<IEnumerable<Property>> GetByPropertyTypeAsync(Guid propertyTypeId, CancellationToken ct = default);

    /// <summary>
    /// Gets properties by listing kind (Sale or Rent).
    /// </summary>
    Task<IEnumerable<Property>> GetByListingKindAsync(ListingKind listingKind, CancellationToken ct = default);

    /// <summary>
    /// Searches properties using a predicate.
    /// </summary>
    Task<IEnumerable<Property>> FindAsync(Expression<Func<Property, bool>> predicate, CancellationToken ct = default);

    /// <summary>
    /// Gets paginated properties with optional filtering.
    /// </summary>
    Task<(IEnumerable<Property> Items, int TotalCount)> GetPaginatedAsync(
        int pageNumber,
        int pageSize,
        Expression<Func<Property, bool>>? predicate = null,
        CancellationToken ct = default);

    // ---- Write Operations ----

    /// <summary>
    /// Adds a new property to the repository.
    /// </summary>
    Task<Result<Property>> AddAsync(Property property, CancellationToken ct = default);

    /// <summary>
    /// Updates an existing property.
    /// </summary>
    Task<Result<Updated>> UpdateAsync(Property property, CancellationToken ct = default);

    /// <summary>
    /// Removes a property from the repository.
    /// </summary>
    Task<Result<Deleted>> RemoveAsync(Property property, CancellationToken ct = default);

    /// <summary>
    /// Removes multiple properties.
    /// </summary>
    Task<Result<Deleted>> RemoveRangeAsync(IEnumerable<Property> properties, CancellationToken ct = default);

    // ---- Batch Operations ----

    /// <summary>
    /// Saves all pending changes to the repository.
    /// </summary>
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}