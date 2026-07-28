using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Agents.Admin.Command.UpdateAgent;

public sealed class UpdateAgentHandler : ICommandHandler<UpdateAgentCommand, Updated>
{
    private readonly IAgentRepository _agents;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateAgentHandler(IAgentRepository agents, IUnitOfWork unitOfWork)
    {
        _agents = agents;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(UpdateAgentCommand request, CancellationToken cancellationToken)
    {
        var agent = await _agents.GetByIdAsync(request.Id, cancellationToken);
        if (agent is null) return AgentErrors.NotFound;

        // Check the slug the entity WILL store (normalized), excluding this agent itself.
        var normalizedSlug = Agent.NormalizeSlug(
            string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug);
        if (await _agents.SlugTakenAsync(normalizedSlug, exceptId: agent.Id, cancellationToken))
            return AgentErrors.SlugTaken;

        var updated = agent.Update(
            request.Name, request.JobTitle, request.PhotoUrl, request.Slug,
            request.Phone, request.WhatsApp, request.Email, request.Rating, request.Bio);
        if (updated.IsError) return updated.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
