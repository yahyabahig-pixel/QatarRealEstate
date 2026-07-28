using Auth.Application.Abstractions.Identity;
using Auth.Application.Abstractions.Messaging;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.UpdateAdmin;

public sealed class UpdateAdminHandler : ICommandHandler<UpdateAdminCommand, Updated>
{
    private readonly IIdentityService _identity;

    public UpdateAdminHandler(IIdentityService identity) => _identity = identity;

    public async Task<Result<Updated>> Handle(UpdateAdminCommand request, CancellationToken ct)
    {
        // THE pattern every management handler follows:
        // load the TARGET from the DB, protect the Main Admin FIRST, then act.
        var target = await _identity.FindByIdAsync(request.AdminId, ct);
        if (target is null) return AdminErrors.NotFound;
        if (target.IsMainAdmin) return AdminErrors.MainAdminProtected;

        return await _identity.UpdateFullNameAsync(request.AdminId, request.FullName, ct);
    }
}
