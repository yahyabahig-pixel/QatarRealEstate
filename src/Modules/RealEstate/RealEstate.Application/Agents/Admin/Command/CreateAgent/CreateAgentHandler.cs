using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Agents.Admin.Command.CreateAgent;

public sealed class CreateAgentHandler : ICommandHandler<CreateAgentCommand, Guid>
{
    private readonly IAgentRepository _agents;
    private readonly IUnitOfWork _unitOfWork;

    public CreateAgentHandler(IAgentRepository agents, IUnitOfWork unitOfWork)
    {
        _agents = agents;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateAgentCommand request, CancellationToken cancellationToken)
    {
        var agent = Agent.Create(
            request.Name, request.JobTitle, request.PhotoUrl, request.Slug,
            request.Phone, request.WhatsApp, request.Email, request.Rating, request.Bio);

        if (agent.IsError) return agent.TopError;

        // Uniqueness check AFTER Create so we test the normalized slug the entity will store.
        if (await _agents.SlugTakenAsync(agent.Value.Slug, exceptId: null, cancellationToken))
            return AgentErrors.SlugTaken;

        await _agents.AddAsync(agent.Value, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);   // EF generates the id here

        return agent.Value.Id;
    }
}
