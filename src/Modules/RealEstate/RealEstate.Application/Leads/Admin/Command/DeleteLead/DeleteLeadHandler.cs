using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Properties.Admin.Policies;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Leads.Admin.Command.DeleteLead;

public sealed class DeleteLeadHandler : ICommandHandler<DeleteLeadCommand, Updated>
{
    private readonly ILeadRepository _leads;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyAuthorizationPolicy _authorization;

    public DeleteLeadHandler(ILeadRepository leads, IUnitOfWork unitOfWork, PropertyAuthorizationPolicy authorization)
    {
        _leads = leads;
        _unitOfWork = unitOfWork;
        _authorization = authorization;
    }

    public async Task<Result<Updated>> Handle(DeleteLeadCommand request, CancellationToken cancellationToken)
    {
        var canAccess = _authorization.CanAccessAdmin();
        if (canAccess.IsError) return canAccess.TopError;

        var lead = await _leads.GetByIdAsync(request.Id, cancellationToken);
        if (lead is null) return LeadErrors.NotFound;

        _leads.Remove(lead);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
