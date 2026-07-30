using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Features.Admin.Command.CreateFeature;

public sealed class CreateFeatureHandler : ICommandHandler<CreateFeatureCommand, Guid>
{
    private readonly IFeatureRepository _features;
    private readonly IUnitOfWork _unitOfWork;

    public CreateFeatureHandler(IFeatureRepository features, IUnitOfWork unitOfWork)
    {
        _features = features;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateFeatureCommand request, CancellationToken cancellationToken)
    {
        // Names are the identity admins think in — "Parking" twice would make the
        // property form ambiguous, so duplicates are a 409, not a second row.
        if (await _features.ExistsByNameAsync(request.Name, null, cancellationToken))
            return FeatureErrors.NameTaken;

        var feature = Feature.Create(request.Name, request.ValueType, request.Icon);
        if (feature.IsError) return feature.TopError;

        await _features.AddAsync(feature.Value, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return feature.Value.Id;
    }
}
