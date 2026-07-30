using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Application.Jobs.User.Queries.GetOpenJobs;

public sealed class GetOpenJobsHandler
    : IQueryHandler<GetOpenJobsQuery, IReadOnlyList<JobDto>>
{
    private readonly IJobQueries _queries;
    public GetOpenJobsHandler(IJobQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<JobDto>>> Handle(
        GetOpenJobsQuery request, CancellationToken cancellationToken)
    {
        // includeInactive: false is the whole security story of this endpoint — a closed advert
        // is never reachable anonymously, whatever query string arrives.
        var items = await _queries.ListAsync(includeInactive: false, request.Department, cancellationToken);
        return Result<IReadOnlyList<JobDto>>.Success(items);
    }
}
