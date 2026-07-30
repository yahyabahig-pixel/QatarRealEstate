using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Leads.User.Command.CreateInquiryLead;

public sealed class CreateInquiryLeadHandler : ICommandHandler<CreateInquiryLeadCommand, Guid>
{
    private readonly ILeadRepository _leads;
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;

    public CreateInquiryLeadHandler(ILeadRepository leads, IPropertyRepository properties, IUnitOfWork unitOfWork)
    {
        _leads = leads;
        _properties = properties;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateInquiryLeadCommand request, CancellationToken cancellationToken)
    {
        // A PropertyInquiry must point at a listing that actually exists — the one domain
        // rule the aggregate cannot check by itself.
        if (request.PropertyId.HasValue &&
            await _properties.GetByIdAsync(request.PropertyId.Value, cancellationToken) is null)
            return LeadErrors.PropertyNotFound;

        var lead = Lead.CreateInquiry(
            request.FullName, request.Phone, request.Email, request.Message,
            request.PropertyId, request.AgentId, request.Source);
        if (lead.IsError) return lead.TopError;

        await _leads.AddAsync(lead.Value, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Admin notification seam: no email/notification infrastructure exists in the
        // project today — when one arrives, publish from here, after the commit.
        return lead.Value.Id;
    }
}
