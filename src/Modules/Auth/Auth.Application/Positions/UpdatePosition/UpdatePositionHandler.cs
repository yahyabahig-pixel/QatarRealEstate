using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.UpdatePosition;

public sealed class UpdatePositionHandler : ICommandHandler<UpdatePositionCommand, Updated>
{
    private readonly IPositionRepository _positions;
    private readonly IAuthUnitOfWork _unitOfWork;

    public UpdatePositionHandler(IPositionRepository positions, IAuthUnitOfWork unitOfWork)
    {
        _positions = positions;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(UpdatePositionCommand request, CancellationToken ct)
    {
        var position = await _positions.GetByIdAsync(request.PositionId, ct);
        if (position is null) return PositionErrors.NotFound;

        if (await _positions.ExistsByNameAsync(request.Name, excludeId: position.Id, ct))
            return PositionErrors.DuplicateName;

        var updated = position.Update(request.Name, request.Description);
        if (updated.IsError) return updated.TopError;

        await _unitOfWork.SaveChangesAsync(ct);
        return Result.Updated;
    }
}
