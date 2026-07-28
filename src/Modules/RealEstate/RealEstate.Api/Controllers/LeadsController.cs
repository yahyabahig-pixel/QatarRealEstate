using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using Microsoft.AspNetCore.Mvc;
using RealEstate.Application.Leads.User.Command.CreateInquiryLead;
using RealEstate.Application.Leads.User.Command.CreateListingRequestLead;

namespace RealEstate.Api.Controllers;

// PUBLIC lead intake. Anonymous by design; the commands accept ONLY contact + context
// fields — status, type and assignment are decided server-side and cannot be posted.
[Route("api/leads")]
public sealed class LeadsController : ApiControllerBase
{
    // POST /api/leads/inquiry — property inquiry (propertyId set) or general inquiry.
    [HttpPost("inquiry")]
    public async Task<IActionResult> Inquiry([FromBody] CreateInquiryLeadCommand command, CancellationToken ct)
        => (await Sender.Send(command, ct)).ToOk();

    // POST /api/leads/listing-request — "List your property with us".
    [HttpPost("listing-request")]
    public async Task<IActionResult> ListingRequest([FromBody] CreateListingRequestLeadCommand command, CancellationToken ct)
        => (await Sender.Send(command, ct)).ToOk();
}
