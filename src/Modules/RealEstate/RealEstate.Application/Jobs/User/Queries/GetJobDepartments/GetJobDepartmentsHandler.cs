using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Application.Jobs.User.Queries.GetJobDepartments;

public sealed class GetJobDepartmentsHandler
    : IQueryHandler<GetJobDepartmentsQuery, IReadOnlyList<string>>
{
    private readonly IJobQueries _queries;
    public GetJobDepartmentsHandler(IJobQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<string>>> Handle(
        GetJobDepartmentsQuery request, CancellationToken cancellationToken)
    {
        var departments = await _queries.ListDepartmentsAsync(cancellationToken);
        return Result<IReadOnlyList<string>>.Success(departments);
    }
}
