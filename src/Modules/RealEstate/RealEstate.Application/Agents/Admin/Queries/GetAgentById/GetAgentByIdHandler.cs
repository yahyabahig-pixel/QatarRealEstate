using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Agents.Admin.Queries.GetAgentById;

public sealed class GetAgentByIdHandler : IQueryHandler<GetAgentByIdQuery, AgentDto>
{
    private readonly IAgentQueries _queries;
    public GetAgentByIdHandler(IAgentQueries queries) => _queries = queries;

    public async Task<Result<AgentDto>> Handle(GetAgentByIdQuery request, CancellationToken cancellationToken)
    {
        var agent = await _queries.GetByIdAsync(request.Id, cancellationToken);
        if (agent is null) return AgentErrors.NotFound;
        return agent;
    }
}
