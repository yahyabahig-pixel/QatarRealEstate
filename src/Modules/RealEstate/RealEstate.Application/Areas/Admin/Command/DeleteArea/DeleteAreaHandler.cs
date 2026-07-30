using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Areas.Admin.Command.DeleteArea;

public sealed class DeleteAreaHandler : ICommandHandler<DeleteAreaCommand, Deleted>
{
    private readonly IAreaRepository _areas;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteAreaHandler(IAreaRepository areas, IUnitOfWork unitOfWork)
    {
        _areas = areas;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Deleted>> Handle(DeleteAreaCommand request, CancellationToken cancellationToken)
    {
        var area = await _areas.GetByIdAsync(request.Id, cancellationToken);
        if (area is null) return AreaErrors.NotFound;

        // Friendly 409 before the FK (Restrict) would throw: an area with listings filed
        // under it cannot be deleted — reassign the properties first.
        if (await _areas.IsInUseAsync(area.Id, cancellationToken))
            return AreaErrors.InUse;

        _areas.Remove(area);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Deleted;
    }
}
