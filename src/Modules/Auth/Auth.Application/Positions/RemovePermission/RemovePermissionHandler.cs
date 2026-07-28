using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.RemovePermission;

public sealed class RemovePermissionHandler : ICommandHandler<RemovePermissionCommand, Updated>
{
    private readonly IPositionRepository _positions;
    private readonly IAuthUnitOfWork _unitOfWork;

    public RemovePermissionHandler(IPositionRepository positions, IAuthUnitOfWork unitOfWork)
    {
        _positions = positions;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(RemovePermissionCommand request, CancellationToken ct)
    {
        var position = await _positions.GetByIdWithPermissionsAsync(request.PositionId, ct);
        if (position is null) return PositionErrors.NotFound;

        var removed = position.RemovePermission(request.Permission);
        if (removed.IsError) return removed.TopError;

        await _unitOfWork.SaveChangesAsync(ct);
        return Result.Updated;
    }
}
