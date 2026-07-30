using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Jobs.Admin.Queries.GetJobById;

public sealed class GetJobByIdHandler : IQueryHandler<GetJobByIdQuery, JobDto>
{
    private readonly IJobQueries _queries;
    public GetJobByIdHandler(IJobQueries queries) => _queries = queries;

    public async Task<Result<JobDto>> Handle(GetJobByIdQuery request, CancellationToken cancellationToken)
    {
        var job = await _queries.GetByIdAsync(request.Id, cancellationToken);
        if (job is null) return JobErrors.NotFound;
        return job;
    }
}
