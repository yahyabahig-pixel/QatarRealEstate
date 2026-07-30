using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Areas.Admin.Command.CreateArea;

public sealed class CreateAreaHandler : ICommandHandler<CreateAreaCommand, Guid>
{
    private readonly IAreaRepository _areas;
    private readonly IUnitOfWork _unitOfWork;

    public CreateAreaHandler(IAreaRepository areas, IUnitOfWork unitOfWork)
    {
        _areas = areas;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateAreaCommand request, CancellationToken cancellationToken)
    {
        var area = Area.Create(request.Name, request.PhotoUrl, request.Slug, request.Intro);
        if (area.IsError) return area.TopError;

        // Uniqueness check AFTER Create so we test the normalized slug the entity will store.
        if (await _areas.SlugTakenAsync(area.Value.Slug, exceptId: null, cancellationToken))
            return AreaErrors.SlugTaken;

        await _areas.AddAsync(area.Value, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);   // EF generates the id here

        return area.Value.Id;
    }
}
