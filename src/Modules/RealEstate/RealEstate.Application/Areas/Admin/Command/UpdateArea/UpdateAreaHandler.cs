using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Common;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Areas.Admin.Command.UpdateArea;

public sealed class UpdateAreaHandler : ICommandHandler<UpdateAreaCommand, Updated>
{
    private readonly IAreaRepository _areas;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateAreaHandler(IAreaRepository areas, IUnitOfWork unitOfWork)
    {
        _areas = areas;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(UpdateAreaCommand request, CancellationToken cancellationToken)
    {
        var area = await _areas.GetByIdAsync(request.Id, cancellationToken);
        if (area is null) return AreaErrors.NotFound;

        // Check the slug the entity WILL store (normalized), excluding this area itself.
        var normalizedSlug = SlugHelper.Normalize(
            string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug);
        if (await _areas.SlugTakenAsync(normalizedSlug, exceptId: area.Id, cancellationToken))
            return AreaErrors.SlugTaken;

        var updated = area.Update(request.Name, request.PhotoUrl, request.Slug, request.Intro);
        if (updated.IsError) return updated.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
