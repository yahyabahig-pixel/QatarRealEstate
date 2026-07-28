using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Jobs.Admin.Command.CreateJob;

public sealed class CreateJobHandler : ICommandHandler<CreateJobCommand, Guid>
{
    private readonly IJobRepository _jobs;
    private readonly IUnitOfWork _unitOfWork;

    public CreateJobHandler(IJobRepository jobs, IUnitOfWork unitOfWork)
    {
        _jobs = jobs;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateJobCommand request, CancellationToken cancellationToken)
    {
        var job = Job.Create(
            request.Title, request.Department, request.EmploymentType,
            request.Location, request.Description);

        if (job.IsError) return job.TopError;

        await _jobs.AddAsync(job.Value, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);   // EF generates the id here

        return job.Value.Id;
    }
}
