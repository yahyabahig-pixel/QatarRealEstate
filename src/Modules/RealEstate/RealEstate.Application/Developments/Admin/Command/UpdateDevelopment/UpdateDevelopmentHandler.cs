using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Common;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.ValueObjects;

namespace RealEstate.Application.Developments.Admin.Command.UpdateDevelopment;

public sealed class UpdateDevelopmentHandler : ICommandHandler<UpdateDevelopmentCommand, Updated>
{
    private readonly IDevelopmentRepository _developments;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateDevelopmentHandler(IDevelopmentRepository developments, IUnitOfWork unitOfWork)
    {
        _developments = developments;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Updated>> Handle(UpdateDevelopmentCommand request, CancellationToken cancellationToken)
    {
        var development = await _developments.GetByIdAsync(request.Id, cancellationToken);
        if (development is null) return DevelopmentErrors.NotFound;

        // Check the slug the entity WILL store (normalized), excluding this development itself.
        var normalizedSlug = SlugHelper.Normalize(
            string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug);
        if (await _developments.SlugTakenAsync(normalizedSlug, exceptId: development.Id, cancellationToken))
            return DevelopmentErrors.SlugTaken;

        var location = Location.Create(
            request.Location.Country, request.Location.City, request.Location.Street,
            request.Location.PostalCode, request.Location.State,
            request.Location.X, request.Location.Y, request.Location.Description);
        if (location.IsError) return location.TopError;

        var updated = development.Update(
            request.Name, location.Value, request.DeliveryYear, request.CoverImageUrl,
            request.Slug, request.Description, request.UnitsCount, request.DeveloperName,
            request.StartingPrice, request.PaymentPlan);
        if (updated.IsError) return updated.TopError;

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Updated;
    }
}
