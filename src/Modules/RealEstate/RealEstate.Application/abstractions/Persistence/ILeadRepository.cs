using RealEstate.Domain.Entities;

namespace RealEstate.Application.Abstractions.Persistence;

public interface ILeadRepository
{
    Task AddAsync(Lead lead, CancellationToken ct = default);
    Task<Lead?> GetByIdAsync(Guid id, CancellationToken ct = default);
    void Remove(Lead lead);
}
