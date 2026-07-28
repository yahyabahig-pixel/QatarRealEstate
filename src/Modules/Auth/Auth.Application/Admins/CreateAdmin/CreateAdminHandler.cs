using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.CreateAdmin;

public sealed class CreateAdminHandler : ICommandHandler<CreateAdminCommand, Guid>
{
    private readonly IIdentityService _identity;
    private readonly IPositionRepository _positions;

    public CreateAdminHandler(IIdentityService identity, IPositionRepository positions)
    {
        _identity = identity;
        _positions = positions;
    }

    public async Task<Result<Guid>> Handle(CreateAdminCommand request, CancellationToken ct)
    {
        // Endpoint gate already required Admin.Create. Handler validates the DATA.
        if (request.PositionId is { } positionId)
        {
            var position = await _positions.GetByIdAsync(positionId, ct);
            if (position is null) return PositionErrors.NotFound;
            if (!position.IsActive) return PositionErrors.Inactive;
        }

        // IIdentityService.CreateAdminAsync can ONLY produce a regular admin:
        // role fixed to "Admin", IsMainAdmin never set — escalation is impossible here
        // because the capability simply does not exist on the interface.
        return await _identity.CreateAdminAsync(
            request.Email, request.Password, request.FullName, request.PositionId, ct);
    }
}
