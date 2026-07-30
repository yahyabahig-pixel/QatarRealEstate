using Auth.Application.Abstractions.Authentication;
using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Contracts.Responses;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Authentication.GetCurrentAdmin;

public sealed record GetCurrentAdminQuery : IQuery<CurrentAdminDto>;

public sealed class GetCurrentAdminHandler : IQueryHandler<GetCurrentAdminQuery, CurrentAdminDto>
{
    private readonly ICurrentAdmin _caller;
    private readonly IAdminQueries _queries;

    public GetCurrentAdminHandler(ICurrentAdmin caller, IAdminQueries queries)
    {
        _caller = caller;
        _queries = queries;
    }

    public async Task<Result<CurrentAdminDto>> Handle(GetCurrentAdminQuery request, CancellationToken ct)
    {
        if (!_caller.IsAuthenticated)
            return AuthErrors.NotAuthenticated;

        var dto = await _queries.GetCurrentAsync(_caller.UserId, ct);
        return dto is null ? AdminErrors.NotFound : dto;
    }
}
