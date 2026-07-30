namespace Auth.Application.Abstractions.Persistence;

public interface IAuthUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
