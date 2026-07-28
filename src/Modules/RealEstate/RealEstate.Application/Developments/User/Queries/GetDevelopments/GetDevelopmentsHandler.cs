using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Application.Developments.User.Queries.GetDevelopments;

public sealed class GetDevelopmentsHandler
    : IQueryHandler<GetDevelopmentsQuery, IReadOnlyList<DevelopmentDto>>
{
    private readonly IDevelopmentQueries _queries;
    public GetDevelopmentsHandler(IDevelopmentQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<DevelopmentDto>>> Handle(
        GetDevelopmentsQuery request, CancellationToken cancellationToken)
    {
        var items = await _queries.ListAsync(cancellationToken);
        return Result<IReadOnlyList<DevelopmentDto>>.Success(items);
    }
}
