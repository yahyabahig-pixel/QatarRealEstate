using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Repositories;

// Write side — tracked entities only. Reads for display go through JobQueries.
public sealed class JobRepository : IJobRepository
{
    private readonly RealEstateDbContext _db;
    public JobRepository(RealEstateDbContext db) => _db = db;

    public Task<Job?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Jobs.FirstOrDefaultAsync(j => j.Id == id, ct);

    public async Task AddAsync(Job job, CancellationToken ct = default) =>
        await _db.Jobs.AddAsync(job, ct);

    public void Remove(Job job) => _db.Jobs.Remove(job);
}
