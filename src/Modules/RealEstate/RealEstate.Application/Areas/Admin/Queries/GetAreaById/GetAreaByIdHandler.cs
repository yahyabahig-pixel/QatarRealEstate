using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Areas.Admin.Queries.GetAreaById;

public sealed class GetAreaByIdHandler : IQueryHandler<GetAreaByIdQuery, AreaDto>
{
    private readonly IAreaQueries _queries;
    public GetAreaByIdHandler(IAreaQueries queries) => _queries = queries;

    public async Task<Result<AreaDto>> Handle(GetAreaByIdQuery request, CancellationToken cancellationToken)
    {
        var area = await _queries.GetByIdAsync(request.Id, cancellationToken);
        if (area is null) return AreaErrors.NotFound;
        return area;
    }
}
