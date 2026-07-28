using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Features.Admin.Command.DeleteFeature;

// Delete only works for a feature no listing uses — PropertyFeature.FeatureId is a
// Restrict FK, so this check turns an opaque database error into a friendly 409 telling
// the admin to detach it from listings (or deactivate) first.
public sealed class DeleteFeatureHandler : ICommandHandler<DeleteFeatureCommand, Deleted>
{
    private readonly IFeatureRepository _features;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteFeatureHandler(IFeatureRepository features, IUnitOfWork unitOfWork)
    {
        _features = features;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Deleted>> Handle(DeleteFeatureCommand request, CancellationToken cancellationToken)
    {
        var feature = await _features.GetByIdAsync(request.Id, cancellationToken);
        if (feature is null) return FeatureErrors.FeatureNotFound;

        if (await _features.IsInUseAsync(request.Id, cancellationToken))
            return FeatureErrors.InUse;

        _features.Remove(feature);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Deleted;
    }
}
