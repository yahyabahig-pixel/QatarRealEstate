using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Agents.User.Queries.GetAgentBySlug;

public sealed class GetAgentBySlugHandler : IQueryHandler<GetAgentBySlugQuery, AgentDto>
{
    private readonly IAgentQueries _queries;
    public GetAgentBySlugHandler(IAgentQueries queries) => _queries = queries;

    public async Task<Result<AgentDto>> Handle(GetAgentBySlugQuery request, CancellationToken cancellationToken)
    {
        // Normalize the incoming segment the same way the entity does, so
        // "/find-agent/Sara-El-Amin" still resolves.
        var slug = Agent.NormalizeSlug(request.Slug ?? string.Empty);
        if (slug.Length == 0) return AgentErrors.NotFound;

        var agent = await _queries.GetBySlugAsync(slug, includeInactive: false, cancellationToken);
        if (agent is null) return AgentErrors.NotFound;
        return agent;
    }
}
