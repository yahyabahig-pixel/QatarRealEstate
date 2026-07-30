using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.AssignPosition;

public sealed class AssignPositionHandler : ICommandHandler<AssignPositionCommand, Updated>
{
    private readonly IIdentityService _identity;
    private readonly IPositionRepository _positions;

    public AssignPositionHandler(IIdentityService identity, IPositionRepository positions)
    {
        _identity = identity;
        _positions = positions;
    }

    public async Task<Result<Updated>> Handle(AssignPositionCommand request, CancellationToken ct)
    {
        var target = await _identity.FindByIdAsync(request.AdminId, ct);
        if (target is null) return AdminErrors.NotFound;

        // The Main Admin's power comes from the flag, never from a position —
        // and nobody rebrands the Main Admin's account, full stop.
        if (target.IsMainAdmin) return AdminErrors.MainAdminProtected;

        var position = await _positions.GetByIdAsync(request.PositionId, ct);
        if (position is null) return PositionErrors.NotFound;
        if (!position.IsActive) return PositionErrors.Inactive;

        return await _identity.SetPositionAsync(request.AdminId, request.PositionId, ct);
    }
}
