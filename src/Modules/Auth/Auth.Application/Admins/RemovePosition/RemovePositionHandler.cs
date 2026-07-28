using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Messaging;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.RemovePosition;

public sealed class RemovePositionHandler : ICommandHandler<RemovePositionCommand, Updated>
{
    private readonly IIdentityService _identity;

    public RemovePositionHandler(IIdentityService identity) => _identity = identity;

    public async Task<Result<Updated>> Handle(RemovePositionCommand request, CancellationToken ct)
    {
        var target = await _identity.FindByIdAsync(request.AdminId, ct);
        if (target is null) return AdminErrors.NotFound;
        if (target.IsMainAdmin) return AdminErrors.MainAdminProtected;
        if (target.PositionId is null) return AdminErrors.NoPositionAssigned;

        return await _identity.SetPositionAsync(request.AdminId, null, ct);
    }
}
