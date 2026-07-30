using Auth.Application.Abstractions.Persistence;

namespace Auth.Infrastructure.Data.UnitOfWork;

public sealed class AuthUnitOfWork : IAuthUnitOfWork
{
    private readonly AuthDbContext _db;

    public AuthUnitOfWork(AuthDbContext db) => _db = db;

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _db.SaveChangesAsync(cancellationToken);
}
