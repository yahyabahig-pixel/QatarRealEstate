using RealEstate.Application.Jobs;

namespace RealEstate.Application.Abstractions.Persistence;

// Read side — projects straight to DTOs with AsNoTracking, mirroring IAgentQueries.
public interface IJobQueries
{
    // department == null → every department. Filtering in SQL rather than in the browser means
    // the public Careers page stays fast no matter how many closed adverts accumulate.
    Task<IReadOnlyList<JobDto>> ListAsync(bool includeInactive, string? department, CancellationToken ct = default);

    Task<JobDto?> GetByIdAsync(Guid id, CancellationToken ct = default);

    // Distinct departments that currently have at least one OPEN role — lets the Careers page
    // build its filter chips from reality instead of a hard-coded array in the frontend.
    Task<IReadOnlyList<string>> ListDepartmentsAsync(CancellationToken ct = default);
}
