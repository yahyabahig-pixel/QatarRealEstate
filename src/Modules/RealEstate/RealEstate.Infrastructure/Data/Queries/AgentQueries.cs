using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Agents;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Queries;

public sealed class AgentQueries : IAgentQueries
{
    private readonly RealEstateDbContext _db;
    public AgentQueries(RealEstateDbContext db) => _db = db;

    public async Task<IReadOnlyList<AgentDto>> ListAsync(bool includeInactive, CancellationToken ct = default) =>
        await Base(includeInactive)
            .OrderByDescending(a => a.Rating).ThenBy(a => a.Name)
            .Select(Projection)
            .ToListAsync(ct);

    public Task<AgentDto?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        Base(includeInactive: true)
            .Where(a => a.Id == id)
            .Select(Projection)
            .FirstOrDefaultAsync(ct);

    public Task<AgentDto?> GetBySlugAsync(string slug, bool includeInactive, CancellationToken ct = default) =>
        Base(includeInactive)
            .Where(a => a.Slug == slug)
            .Select(Projection)
            .FirstOrDefaultAsync(ct);

    private IQueryable<Agent> Base(bool includeInactive)
    {
        var q = _db.Agents.AsNoTracking();
        return includeInactive ? q : q.Where(a => a.IsActive);
    }

    // Single projection shared by every query — SQL-translatable, no entity materialization.
    private static readonly System.Linq.Expressions.Expression<Func<Agent, AgentDto>> Projection =
        a => new AgentDto(
            a.Id, a.Name, a.JobTitle, a.PhotoUrl, a.Slug,
            a.Phone, a.WhatsApp, a.Email, a.Rating, a.Bio, a.IsActive);
}
