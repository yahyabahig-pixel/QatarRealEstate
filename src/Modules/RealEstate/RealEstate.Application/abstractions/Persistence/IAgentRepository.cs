using RealEstate.Domain.Entities;

namespace RealEstate.Application.Abstractions.Persistence;

public interface IAgentRepository
{
    Task<Agent?> GetByIdAsync(Guid id, CancellationToken ct = default);

    // Slug is the public URL segment and must be unique. exceptId lets Update exclude
    // the agent being edited from its own uniqueness check.
    Task<bool> SlugTakenAsync(string slug, Guid? exceptId = null, CancellationToken ct = default);

    Task AddAsync(Agent agent, CancellationToken ct = default);
    void Remove(Agent agent);
}
