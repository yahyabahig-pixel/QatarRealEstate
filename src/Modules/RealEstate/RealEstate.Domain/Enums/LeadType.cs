namespace RealEstate.Domain.Enums;

// What kind of interest this lead represents. A closed set on purpose — new lead sources
// (valuation requests, viewing requests…) get their own member here, never a free string.
public enum LeadType
{
    PropertyInquiry = 1,   // interested in an EXISTING listing (carries PropertyId)
    ListingRequest = 2,    // owner wants US to list THEIR property (carries type/kind/Location)
    GeneralInquiry = 3,    // contact page, agent contact — no property involved
}
