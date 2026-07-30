using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Application.Agents.Admin.Queries.ListAgentsForAdmin;

public sealed class ListAgentsForAdminHandler
    : IQueryHandler<ListAgentsForAdminQuery, IReadOnlyList<AgentDto>>
{
    private readonly IAgentQueries _queries;
    public ListAgentsForAdminHandler(IAgentQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<AgentDto>>> Handle(
        ListAgentsForAdminQuery request, CancellationToken cancellationToken)
    {
        var items = await _queries.ListAsync(includeInactive: true, cancellationToken);
        return Result<IReadOnlyList<AgentDto>>.Success(items);
    }
}
