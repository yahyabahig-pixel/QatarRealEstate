using Auth.Application.Abstractions.Authentication;
using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Authorization;
using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;

namespace Auth.Application.Admins.CreateAdmin;

public sealed class CreateAdminHandler : ICommandHandler<CreateAdminCommand, Guid>
{
    private readonly IIdentityService _identity;
    private readonly IPositionRepository _positions;
    private readonly ICurrentAdmin _caller;

    public CreateAdminHandler(
        IIdentityService identity, IPositionRepository positions, ICurrentAdmin caller)
    {
        _identity = identity;
        _positions = positions;
        _caller = caller;
    }

    public async Task<Result<Guid>> Handle(CreateAdminCommand request, CancellationToken ct)
    {
        // Endpoint gate already required Admin.Create. Handler validates the DATA.
        if (request.PositionId is { } positionId)
        {
            // Giving an account a position IS granting it that position's permissions, so it
            // takes Admin.AssignPosition — the same authority the dedicated endpoint requires.
            //
            // Without this, Admin.Create alone was enough: hand the new account the most
            // powerful position in the system, log in as it, and the holder of a
            // create-accounts permission had just granted themselves everything. Creating an
            // account and deciding what it may do are two authorities, and this is the line
            // between them.
            if (!_caller.HasPermission(AppPermissions.Admin.AssignPosition))
                return Error.Forbidden(
                    "Admin.PositionRequiresAssignPermission",
                    "Assigning a position while creating an account requires the " +
                    "Admin.AssignPosition permission. Create the account without a position, " +
                    "then ask someone who holds that permission to assign one.");

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
