using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Leads.User.Command.CreateInquiryLead;

// PUBLIC endpoint payload. Note what is NOT here: status, type, assignment — the backend
// decides all of that. PropertyId present → PropertyInquiry (verified to exist);
// absent → GeneralInquiry (contact page, agent contact).
public sealed record CreateInquiryLeadCommand(
    string FullName,
    string Phone,
    string Email,
    string? Message = null,
    Guid? PropertyId = null,
    Guid? AgentId = null,
    string? Source = null) : ICommand<Guid>;
