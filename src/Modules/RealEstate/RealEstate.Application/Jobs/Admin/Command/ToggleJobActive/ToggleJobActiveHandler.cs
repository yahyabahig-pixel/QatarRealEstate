using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Jobs.Admin.Command.ToggleJobActive;

public sealed class ToggleJobActiveHandler : ICommandHandler<ToggleJobActiveCommand, Updated>
{
    private readonly IJobRepository _jobs;
    private readonly IUnitOfWork _unitOfWork;

    public ToggleJobActiveHandler(IJobRepository jobs, IUnitOfWork unitOfWork)
    {
        _jobs = jobs;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(ToggleJobActiveCommand request, CancellationToken cancellationToken)
    {
        var job = await _jobs.GetByIdAsync(request.Id, cancellationToken);
        if (job is null) return JobErrors.NotFound;

        var result = request.IsActive ? job.Activate() : job.Deactivate();
        if (result.IsError) return result.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
