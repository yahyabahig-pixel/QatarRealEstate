using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.DeletePosition;

public sealed class DeletePositionHandler : ICommandHandler<DeletePositionCommand, Deleted>
{
    private readonly IPositionRepository _positions;
    private readonly IAuthUnitOfWork _unitOfWork;

    public DeletePositionHandler(IPositionRepository positions, IAuthUnitOfWork unitOfWork)
    {
        _positions = positions;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Deleted>> Handle(DeletePositionCommand request, CancellationToken ct)
    {
        var position = await _positions.GetByIdAsync(request.PositionId, ct);
        if (position is null) return PositionErrors.NotFound;

        // A position that admins still hold cannot vanish under them.
        if (await _positions.IsAssignedToAnyAdminAsync(position.Id, ct))
            return PositionErrors.InUse;

        _positions.Remove(position);
        await _unitOfWork.SaveChangesAsync(ct);
        return Result.Deleted;
    }
}
