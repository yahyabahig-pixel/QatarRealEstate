using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Repositories;

public sealed class LeadRepository : ILeadRepository
{
    private readonly RealEstateDbContext _db;
    public LeadRepository(RealEstateDbContext db) => _db = db;

    public async Task AddAsync(Lead lead, CancellationToken ct = default) =>
        await _db.Leads.AddAsync(lead, ct);

    public Task<Lead?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Leads.FirstOrDefaultAsync(l => l.Id == id, ct);

    public void Remove(Lead lead) => _db.Leads.Remove(lead);
}
