using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Repositories;

public sealed class AgentRepository : IAgentRepository
{
    private readonly RealEstateDbContext _db;
    public AgentRepository(RealEstateDbContext db) => _db = db;

    public Task<Agent?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Agents.FirstOrDefaultAsync(a => a.Id == id, ct);

    public Task<bool> SlugTakenAsync(string slug, Guid? exceptId = null, CancellationToken ct = default) =>
        _db.Agents.AnyAsync(a => a.Slug == slug && (exceptId == null || a.Id != exceptId), ct);

    public async Task AddAsync(Agent agent, CancellationToken ct = default) =>
        await _db.Agents.AddAsync(agent, ct);

    public void Remove(Agent agent) => _db.Agents.Remove(agent);
}
