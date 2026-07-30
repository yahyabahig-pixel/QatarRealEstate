using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Agents.Admin.Command.ToggleAgentActive;

public sealed class ToggleAgentActiveHandler : ICommandHandler<ToggleAgentActiveCommand, Updated>
{
    private readonly IAgentRepository _agents;
    private readonly IUnitOfWork _unitOfWork;

    public ToggleAgentActiveHandler(IAgentRepository agents, IUnitOfWork unitOfWork)
    {
        _agents = agents;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(ToggleAgentActiveCommand request, CancellationToken cancellationToken)
    {
        var agent = await _agents.GetByIdAsync(request.Id, cancellationToken);
        if (agent is null) return AgentErrors.NotFound;

        var result = request.IsActive ? agent.Activate() : agent.Deactivate();
        if (result.IsError) return result.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
