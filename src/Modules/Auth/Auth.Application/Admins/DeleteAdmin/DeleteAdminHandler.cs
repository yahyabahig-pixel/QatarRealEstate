using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Messaging;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.DeleteAdmin;

// Hard delete. The Admin.Delete permission is in NO seeded position, so in practice
// only the Main Admin can reach this handler — matching the vision doc's
// "hard delete is Super Admin only" policy. Deactivate is the everyday path.
public sealed class DeleteAdminHandler : ICommandHandler<DeleteAdminCommand, Deleted>
{
    private readonly IIdentityService _identity;

    public DeleteAdminHandler(IIdentityService identity) => _identity = identity;

    public async Task<Result<Deleted>> Handle(DeleteAdminCommand request, CancellationToken ct)
    {
        var target = await _identity.FindByIdAsync(request.AdminId, ct);
        if (target is null) return AdminErrors.NotFound;

        // "The Main Admin cannot be deleted." — no caller, whoever they are, gets past this.
        if (target.IsMainAdmin) return AdminErrors.MainAdminProtected;

        return await _identity.DeleteAsync(request.AdminId, ct);
    }
}
