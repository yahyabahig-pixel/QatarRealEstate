using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Infrastructure.Data.UnitOfWork;

// One commit per use case. EF's SaveChanges already wraps all pending changes in a single
// DB transaction, so no explicit BeginTransaction is needed for the normal path.
public sealed class EfUnitOfWork : IUnitOfWork
{
    private readonly RealEstateDbContext _db;
    public EfUnitOfWork(RealEstateDbContext db) => _db = db;

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _db.SaveChangesAsync(cancellationToken);
}