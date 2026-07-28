using RealEstate.Domain.Entities;

namespace RealEstate.Application.Abstractions.Persistence;

public interface IDevelopmentRepository
{
    Task<Development?> GetByIdAsync(Guid id, CancellationToken ct = default);

    // Slug is the public URL segment and must be unique. exceptId lets Update exclude
    // the development being edited from its own uniqueness check.
    Task<bool> SlugTakenAsync(string slug, Guid? exceptId = null, CancellationToken ct = default);

    Task AddAsync(Development development, CancellationToken ct = default);
    void Remove(Development development);
}
