using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Application.Jobs.Admin.Queries.ListJobsForAdmin;

public sealed class ListJobsForAdminHandler
    : IQueryHandler<ListJobsForAdminQuery, IReadOnlyList<JobDto>>
{
    private readonly IJobQueries _queries;
    public ListJobsForAdminHandler(IJobQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<JobDto>>> Handle(
        ListJobsForAdminQuery request, CancellationToken cancellationToken)
    {
        var items = await _queries.ListAsync(includeInactive: true, request.Department, cancellationToken);
        return Result<IReadOnlyList<JobDto>>.Success(items);
    }
}
