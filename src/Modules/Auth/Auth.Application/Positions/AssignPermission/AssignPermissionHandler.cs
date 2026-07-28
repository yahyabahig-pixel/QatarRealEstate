using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.AssignPermission;

// Granting power to a position. The endpoint requires Permission.Assign — which no seeded
// position carries, so by default only the Main Admin can widen anyone's reach.
// The aggregate validates the permission against the catalog: unknown strings can't be stored.
public sealed class AssignPermissionHandler : ICommandHandler<AssignPermissionCommand, Updated>
{
    private readonly IPositionRepository _positions;
    private readonly IAuthUnitOfWork _unitOfWork;

    public AssignPermissionHandler(IPositionRepository positions, IAuthUnitOfWork unitOfWork)
    {
        _positions = positions;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(AssignPermissionCommand request, CancellationToken ct)
    {
        var position = await _positions.GetByIdWithPermissionsAsync(request.PositionId, ct);
        if (position is null) return PositionErrors.NotFound;

        var assigned = position.AssignPermission(request.Permission);
        if (assigned.IsError) return assigned.TopError;

        await _unitOfWork.SaveChangesAsync(ct);
        return Result.Updated;
    }
}
