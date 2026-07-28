using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Contracts.Responses;
using Auth.Domain.DomainErrors;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Admins.GetAdmin;

public sealed record GetAdminQuery(Guid AdminId) : IQuery<AdminDto>;

public sealed class GetAdminHandler : IQueryHandler<GetAdminQuery, AdminDto>
{
    private readonly IAdminQueries _queries;

    public GetAdminHandler(IAdminQueries queries) => _queries = queries;

    public async Task<Result<AdminDto>> Handle(GetAdminQuery request, CancellationToken ct)
    {
        var dto = await _queries.GetByIdAsync(request.AdminId, ct);
        return dto is null ? AdminErrors.NotFound : dto;
    }
}
