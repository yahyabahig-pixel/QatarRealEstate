using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;

namespace RealEstate.Application.Agents.User.Queries.GetActiveAgents;

public sealed class GetActiveAgentsHandler
    : IQueryHandler<GetActiveAgentsQuery, IReadOnlyList<AgentDto>>
{
    private readonly IAgentQueries _queries;
    public GetActiveAgentsHandler(IAgentQueries queries) => _queries = queries;

    public async Task<Result<IReadOnlyList<AgentDto>>> Handle(
        GetActiveAgentsQuery request, CancellationToken cancellationToken)
    {
        var items = await _queries.ListAsync(includeInactive: false, cancellationToken);
        return Result<IReadOnlyList<AgentDto>>.Success(items);
    }
}
