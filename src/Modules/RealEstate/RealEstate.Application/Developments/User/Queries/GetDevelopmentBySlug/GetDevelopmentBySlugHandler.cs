using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Common;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Developments.User.Queries.GetDevelopmentBySlug;

public sealed class GetDevelopmentBySlugHandler : IQueryHandler<GetDevelopmentBySlugQuery, DevelopmentDto>
{
    private readonly IDevelopmentQueries _queries;
    public GetDevelopmentBySlugHandler(IDevelopmentQueries queries) => _queries = queries;

    public async Task<Result<DevelopmentDto>> Handle(GetDevelopmentBySlugQuery request, CancellationToken cancellationToken)
    {
        // Normalize the incoming segment the same way the entity does, so
        // "/development/Crescent-Bay-Residences" still resolves.
        var slug = SlugHelper.Normalize(request.Slug ?? string.Empty);
        if (slug.Length == 0) return DevelopmentErrors.NotFound;

        var development = await _queries.GetBySlugAsync(slug, cancellationToken);
        if (development is null) return DevelopmentErrors.NotFound;
        return development;
    }
}
