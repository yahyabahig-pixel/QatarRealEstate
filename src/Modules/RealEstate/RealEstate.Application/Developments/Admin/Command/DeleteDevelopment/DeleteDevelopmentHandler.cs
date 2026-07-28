using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Developments.Admin.Command.DeleteDevelopment;

// Hard delete — a development page either exists or it doesn't; nothing references it by FK.
public sealed class DeleteDevelopmentHandler : ICommandHandler<DeleteDevelopmentCommand, Deleted>
{
    private readonly IDevelopmentRepository _developments;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteDevelopmentHandler(IDevelopmentRepository developments, IUnitOfWork unitOfWork)
    {
        _developments = developments;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Deleted>> Handle(DeleteDevelopmentCommand request, CancellationToken cancellationToken)
    {
        var development = await _developments.GetByIdAsync(request.Id, cancellationToken);
        if (development is null) return DevelopmentErrors.NotFound;

        _developments.Remove(development);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Deleted;
    }
}
