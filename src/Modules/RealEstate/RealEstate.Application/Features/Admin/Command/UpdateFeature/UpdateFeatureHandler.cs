using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Features.Admin.Command.UpdateFeature;

public sealed class UpdateFeatureHandler : ICommandHandler<UpdateFeatureCommand, Updated>
{
    private readonly IFeatureRepository _features;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateFeatureHandler(IFeatureRepository features, IUnitOfWork unitOfWork)
    {
        _features = features;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(UpdateFeatureCommand request, CancellationToken cancellationToken)
    {
        var feature = await _features.GetByIdAsync(request.Id, cancellationToken);
        if (feature is null) return FeatureErrors.FeatureNotFound;

        if (await _features.ExistsByNameAsync(request.Name, exceptId: request.Id, ct: cancellationToken))
            return FeatureErrors.NameTaken;

        var updated = feature.Update(request.Name, request.ValueType, request.Icon);
        if (updated.IsError) return updated.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
