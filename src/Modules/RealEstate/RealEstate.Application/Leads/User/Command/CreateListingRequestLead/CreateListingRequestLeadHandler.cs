using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;
using RealEstate.Domain.ValueObjects;

namespace RealEstate.Application.Leads.User.Command.CreateListingRequestLead;

public sealed class CreateListingRequestLeadHandler : ICommandHandler<CreateListingRequestLeadCommand, Guid>
{
    private readonly ILeadRepository _leads;
    private readonly IUnitOfWork _unitOfWork;

    public CreateListingRequestLeadHandler(ILeadRepository leads, IUnitOfWork unitOfWork)
    {
        _leads = leads;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateListingRequestLeadCommand request, CancellationToken cancellationToken)
    {
        var location = Location.Create(
            request.Location.Country, request.Location.City, request.Location.Street,
            request.Location.PostalCode, request.Location.State,
            request.Location.X, request.Location.Y, request.Location.Description);
        if (location.IsError) return location.TopError;

        var lead = Lead.CreateListingRequest(
            request.FullName, request.Phone, request.Email, request.Message,
            request.PropertyTypeName, request.ListingKind, location.Value, request.Source);
        if (lead.IsError) return lead.TopError;

        await _leads.AddAsync(lead.Value, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return lead.Value.Id;
    }
}
