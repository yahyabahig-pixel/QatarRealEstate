using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Common;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Areas.User.Queries.GetAreaBySlug;

public sealed class GetAreaBySlugHandler : IQueryHandler<GetAreaBySlugQuery, AreaDto>
{
    private readonly IAreaQueries _queries;
    public GetAreaBySlugHandler(IAreaQueries queries) => _queries = queries;

    public async Task<Result<AreaDto>> Handle(GetAreaBySlugQuery request, CancellationToken cancellationToken)
    {
        // Normalize the incoming segment the same way the entity does, so
        // "/areas/The-Pearl" still resolves.
        var slug = SlugHelper.Normalize(request.Slug ?? string.Empty);
        if (slug.Length == 0) return AreaErrors.NotFound;

        var area = await _queries.GetBySlugAsync(slug, cancellationToken);
        if (area is null) return AreaErrors.NotFound;
        return area;
    }
}
