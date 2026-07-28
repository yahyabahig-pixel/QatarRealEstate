using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Jobs.Admin.Command.UpdateJob;

public sealed class UpdateJobHandler : ICommandHandler<UpdateJobCommand, Updated>
{
    private readonly IJobRepository _jobs;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateJobHandler(IJobRepository jobs, IUnitOfWork unitOfWork)
    {
        _jobs = jobs;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(UpdateJobCommand request, CancellationToken cancellationToken)
    {
        var job = await _jobs.GetByIdAsync(request.Id, cancellationToken);
        if (job is null) return JobErrors.NotFound;

        // No slug uniqueness check here — a job has no public URL, so duplicate titles are legal.
        var updated = job.Update(
            request.Title, request.Department, request.EmploymentType,
            request.Location, request.Description);
        if (updated.IsError) return updated.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
