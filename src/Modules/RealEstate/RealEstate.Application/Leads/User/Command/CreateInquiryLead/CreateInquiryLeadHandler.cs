using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Leads.User.Command.CreateInquiryLead;

public sealed class CreateInquiryLeadHandler : ICommandHandler<CreateInquiryLeadCommand, Guid>
{
    private readonly ILeadRepository _leads;
    private readonly IPropertyQueries _properties;
    private readonly IUnitOfWork _unitOfWork;

    public CreateInquiryLeadHandler(ILeadRepository leads, IPropertyQueries properties, IUnitOfWork unitOfWork)
    {
        _leads = leads;
        _properties = properties;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateInquiryLeadCommand request, CancellationToken cancellationToken)
    {
        // A PropertyInquiry must point at a listing the VISITOR can actually see — the one
        // domain rule the aggregate cannot check by itself. "Exists" was the old test, and it
        // let an anonymous request attach an enquiry to a draft or an archived listing, which
        // is a way to confirm that a given id is real.
        if (request.PropertyId.HasValue &&
            !await _properties.IsPubliclyVisibleAsync(request.PropertyId.Value, cancellationToken))
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
