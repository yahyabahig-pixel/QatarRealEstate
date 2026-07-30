using RealEstate.Domain.Entities;

namespace RealEstate.Application.Abstractions.Persistence;

public interface IAreaRepository
{
    Task<Area?> GetByIdAsync(Guid id, CancellationToken ct = default);

    // Slug is the public URL segment and must be unique. exceptId lets Update exclude
    // the area being edited from its own uniqueness check.
    Task<bool> SlugTakenAsync(string slug, Guid? exceptId = null, CancellationToken ct = default);

    // True when any property references this area — blocks deletion with a clear 409
    // before the database FK (Restrict) would reject it with a raw exception.
    Task<bool> IsInUseAsync(Guid areaId, CancellationToken ct = default);

    Task AddAsync(Area area, CancellationToken ct = default);
    void Remove(Area area);
}
