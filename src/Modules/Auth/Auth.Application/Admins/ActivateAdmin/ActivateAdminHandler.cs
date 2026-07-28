using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Messaging;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.ActivateAdmin;

public sealed class ActivateAdminHandler : ICommandHandler<ActivateAdminCommand, Updated>
{
    private readonly IIdentityService _identity;

    public ActivateAdminHandler(IIdentityService identity) => _identity = identity;

    public async Task<Result<Updated>> Handle(ActivateAdminCommand request, CancellationToken ct)
    {
        var target = await _identity.FindByIdAsync(request.AdminId, ct);
        if (target is null) return AdminErrors.NotFound;
        if (target.IsMainAdmin) return AdminErrors.MainAdminProtected;
        if (target.IsActive) return AdminErrors.AlreadyActive;

        return await _identity.SetActiveAsync(request.AdminId, true, ct);
    }
}
