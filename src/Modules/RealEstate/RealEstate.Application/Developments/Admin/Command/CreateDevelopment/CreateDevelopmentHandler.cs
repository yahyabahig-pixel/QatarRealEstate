using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Developments.Admin.Command.CreateDevelopment;

public sealed class CreateDevelopmentHandler : ICommandHandler<CreateDevelopmentCommand, Guid>
{
    private readonly IDevelopmentRepository _developments;
    private readonly IUnitOfWork _unitOfWork;

    public CreateDevelopmentHandler(IDevelopmentRepository developments, IUnitOfWork unitOfWork)
    {
        _developments = developments;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateDevelopmentCommand request, CancellationToken cancellationToken)
    {
        var development = Development.Create(
            request.Name, request.AreaName, request.DeliveryYear, request.CoverImageUrl,
            request.Slug, request.Description, request.UnitsCount, request.DeveloperName,
            request.StartingPrice, request.PaymentPlan);

        if (development.IsError) return development.TopError;

        // Uniqueness check AFTER Create so we test the normalized slug the entity will store.
        if (await _developments.SlugTakenAsync(development.Value.Slug, exceptId: null, cancellationToken))
            return DevelopmentErrors.SlugTaken;

        await _developments.AddAsync(development.Value, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);   // EF generates the id here

        return development.Value.Id;
    }
}
