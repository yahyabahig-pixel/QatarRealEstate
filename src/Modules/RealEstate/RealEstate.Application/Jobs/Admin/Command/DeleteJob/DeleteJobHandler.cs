using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Jobs.Admin.Command.DeleteJob;

// Hard delete, and safe to keep hard: nothing references a Job. Applications arrive by email,
// so removing an advert cannot orphan a candidate record. Closing (PUT {id}/active) is still the
// better everyday action — delete is for adverts posted by mistake.
public sealed class DeleteJobHandler : ICommandHandler<DeleteJobCommand, Deleted>
{
    private readonly IJobRepository _jobs;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteJobHandler(IJobRepository jobs, IUnitOfWork unitOfWork)
    {
        _jobs = jobs;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Deleted>> Handle(DeleteJobCommand request, CancellationToken cancellationToken)
    {
        var job = await _jobs.GetByIdAsync(request.Id, cancellationToken);
        if (job is null) return JobErrors.NotFound;

        _jobs.Remove(job);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Deleted;
    }
}
