using Auth.Application.Abstractions.Messaging;
using BuildingBlocks.Authorization;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Permissions.ListPermissions;

// The catalog is code, not data — so this query has no repository at all.
public sealed record ListPermissionsQuery : IQuery<IReadOnlyList<string>>;

public sealed class ListPermissionsHandler : IQueryHandler<ListPermissionsQuery, IReadOnlyList<string>>
{
    public Task<Result<IReadOnlyList<string>>> Handle(ListPermissionsQuery request, CancellationToken ct)
        => Task.FromResult(Result<IReadOnlyList<string>>.Success(AppPermissions.Catalog));
}
