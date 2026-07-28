using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Features.Admin.Command.ToggleFeatureActive;

public sealed class ToggleFeatureActiveHandler : ICommandHandler<ToggleFeatureActiveCommand, Updated>
{
    private readonly IFeatureRepository _features;
    private readonly IUnitOfWork _unitOfWork;

    public ToggleFeatureActiveHandler(IFeatureRepository features, IUnitOfWork unitOfWork)
    {
        _features = features;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(ToggleFeatureActiveCommand request, CancellationToken cancellationToken)
    {
        var feature = await _features.GetByIdAsync(request.Id, cancellationToken);
        if (feature is null) return FeatureErrors.FeatureNotFound;

        var result = request.IsActive ? feature.Activate() : feature.Deactivate();
        if (result.IsError) return result.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
