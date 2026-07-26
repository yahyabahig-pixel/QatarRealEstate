using RealEstate.Domain.Entities;
namespace RealEstate.Application.Abstractions.Persistence;

public interface IFeatureRepository
{
    Task<Feature?> GetByIdAsync(Guid id, CancellationToken ct = default);

    // Used by SetPropertyFeatures: returns only the ACTIVE features among the given ids.
    // The handler compares the returned count to the requested count to reject unknown/inactive ids.
    Task<IReadOnlyList<Feature>> GetActiveByIdsAsync(IReadOnlyCollection<Guid> ids, CancellationToken ct = default);

    // For the admin catalog CRUD:
    Task<bool> ExistsByNameAsync(string name, CancellationToken ct = default);   // block duplicate feature names
    Task AddAsync(Feature feature, CancellationToken ct = default);
}