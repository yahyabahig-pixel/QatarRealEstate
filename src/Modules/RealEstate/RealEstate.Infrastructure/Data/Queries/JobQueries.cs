using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Jobs;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Queries;

public sealed class JobQueries : IJobQueries
{
    private readonly RealEstateDbContext _db;
    public JobQueries(RealEstateDbContext db) => _db = db;

    public async Task<IReadOnlyList<JobDto>> ListAsync(
        bool includeInactive, string? department, CancellationToken ct = default)
    {
        var query = Base(includeInactive);

        if (!string.IsNullOrWhiteSpace(department))
        {
            var wanted = department.Trim();
            query = query.Where(j => j.Department == wanted);
        }

        // Grouped by department, newest advert first inside each — the Careers page renders the
        // list top to bottom without re-sorting in the browser.
        return await query
            .OrderBy(j => j.Department)
            .ThenByDescending(j => j.CreatedAtUtc)
            .Select(Projection)
            .ToListAsync(ct);
    }

    public Task<JobDto?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        Base(includeInactive: true)
            .Where(j => j.Id == id)
            .Select(Projection)
            .FirstOrDefaultAsync(ct);

    // Distinct + ordered in SQL. Only departments with at least one OPEN role appear, so the page
    // can never render a filter chip that would come back empty.
    public async Task<IReadOnlyList<string>> ListDepartmentsAsync(CancellationToken ct = default) =>
        await Base(includeInactive: false)
            .Select(j => j.Department)
            .Distinct()
            .OrderBy(d => d)
            .ToListAsync(ct);

    private IQueryable<Job> Base(bool includeInactive)
    {
        var q = _db.Jobs.AsNoTracking();
        return includeInactive ? q : q.Where(j => j.IsActive);
    }

    // Single projection shared by every query — SQL-translatable, no entity materialization.
    private static readonly System.Linq.Expressions.Expression<Func<Job, JobDto>> Projection =
        j => new JobDto(
            j.Id, j.Title, j.Department, j.EmploymentType,
            j.Location, j.Description, j.IsActive);
}
