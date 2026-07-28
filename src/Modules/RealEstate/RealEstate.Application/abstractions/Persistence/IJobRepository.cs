using RealEstate.Domain.Entities;

namespace RealEstate.Application.Abstractions.Persistence;

// Write side — tracked entities only. No slug uniqueness check here: a job has no public
// URL segment, and two offices may legitimately advertise the same title.
public interface IJobRepository
{
    Task<Job?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(Job job, CancellationToken ct = default);
    void Remove(Job job);
}
