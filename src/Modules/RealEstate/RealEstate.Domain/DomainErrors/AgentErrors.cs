using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class AgentErrors
{
    public static Error NotFound =>
        Error.NotFound("Agent.NotFound", "The requested agent was not found.");

    public static Error NameRequired =>
        Error.Validation("Agent.NameRequired", "Agent name is required.");

    public static Error JobTitleRequired =>
        Error.Validation("Agent.JobTitleRequired", "Agent job title is required.");

    public static Error PhotoUrlRequired =>
        Error.Validation("Agent.PhotoUrlRequired", "Agent portrait photo URL is required.");

    public static Error RatingOutOfRange =>
        Error.Validation("Agent.RatingOutOfRange", "Agent rating must be between 0 and 5.");

    public static Error SlugRequired =>
        Error.Validation("Agent.SlugRequired", "Agent slug is required.");

    public static Error SlugTaken =>
        Error.Conflict("Agent.SlugTaken", "Another agent already uses this slug.");
}
