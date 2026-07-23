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
    Task<Property?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<Property>> GetAllAsync(CancellationToken ct = default);
    Task<IEnumerable<Property>> GetByStatusAsync(PropertyStatus status, CancellationToken ct = default);
    Task<IEnumerable<Property>> GetAvailablePropertiesAsync(CancellationToken ct = default);
    Task<IEnumerable<Property>> GetByPropertyTypeAsync(Guid propertyTypeId, CancellationToken ct = default);
    Task<IEnumerable<Property>> GetByListingKindAsync(ListingKind listingKind, CancellationToken ct = default);

    // ---- Write Operations ----
    void Add(Property property);
    void Update(Property property);
    void Remove(Property property);
}