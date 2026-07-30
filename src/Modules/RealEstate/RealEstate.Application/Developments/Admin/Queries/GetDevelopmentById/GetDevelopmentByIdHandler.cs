using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Developments.Admin.Queries.GetDevelopmentById;

public sealed class GetDevelopmentByIdHandler : IQueryHandler<GetDevelopmentByIdQuery, DevelopmentDto>
{
    private readonly IDevelopmentQueries _queries;
    public GetDevelopmentByIdHandler(IDevelopmentQueries queries) => _queries = queries;

    public async Task<Result<DevelopmentDto>> Handle(GetDevelopmentByIdQuery request, CancellationToken cancellationToken)
    {
        var development = await _queries.GetByIdAsync(request.Id, cancellationToken);
        if (development is null) return DevelopmentErrors.NotFound;
        return development;
    }
}
