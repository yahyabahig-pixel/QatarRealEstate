using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Media.User.Queries.GetImageContent;

public sealed class GetImageContentHandler : IQueryHandler<GetImageContentQuery, StoredImageContentDto>
{
    private readonly IStoredImageQueries _queries;
    public GetImageContentHandler(IStoredImageQueries queries) => _queries = queries;

    public async Task<Result<StoredImageContentDto>> Handle(
        GetImageContentQuery request, CancellationToken cancellationToken)
    {
        var image = await _queries.GetContentAsync(request.Id, cancellationToken);
        if (image is null) return StoredImageErrors.NotFound;
        return image;
    }
}
