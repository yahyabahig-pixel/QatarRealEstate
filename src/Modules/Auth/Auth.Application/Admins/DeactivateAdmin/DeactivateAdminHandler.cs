using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Messaging;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.DeactivateAdmin;

public sealed class DeactivateAdminHandler : ICommandHandler<DeactivateAdminCommand, Updated>
{
    private readonly IIdentityService _identity;

    public DeactivateAdminHandler(IIdentityService identity) => _identity = identity;

    public async Task<Result<Updated>> Handle(DeactivateAdminCommand request, CancellationToken ct)
    {
        var target = await _identity.FindByIdAsync(request.AdminId, ct);
        if (target is null) return AdminErrors.NotFound;

        // "The Main Admin cannot be deactivated." — checked against the DB row, not the payload.
        if (target.IsMainAdmin) return AdminErrors.MainAdminProtected;
        if (!target.IsActive) return AdminErrors.AlreadyInactive;

        return await _identity.SetActiveAsync(request.AdminId, false, ct);
    }
}
