using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Agents.Admin.Command.DeleteAgent;

// Hard delete. Agents have no dependent aggregates in this module (inquiries live only in
// the frontend today) — if a Lead/Inquiry module later references agents, switch this to a
// soft delete or a restrict check.
public sealed class DeleteAgentHandler : ICommandHandler<DeleteAgentCommand, Deleted>
{
    private readonly IAgentRepository _agents;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteAgentHandler(IAgentRepository agents, IUnitOfWork unitOfWork)
    {
        _agents = agents;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Deleted>> Handle(DeleteAgentCommand request, CancellationToken cancellationToken)
    {
        var agent = await _agents.GetByIdAsync(request.Id, cancellationToken);
        if (agent is null) return AgentErrors.NotFound;

        _agents.Remove(agent);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Deleted;
    }
}
