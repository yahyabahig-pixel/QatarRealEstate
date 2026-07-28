namespace RealEstate.Domain.Enums;

// Lifecycle of a lead as the sales team works it. Transitions are deliberately free-form
// for now (any → any); if rules emerge they belong in Lead.SetStatus, nowhere else.
public enum LeadStatus
{
    New = 0,
    Contacted = 1,
    Qualified = 2,
    Converted = 3,
    Lost = 4,
    Archived = 5,
}
