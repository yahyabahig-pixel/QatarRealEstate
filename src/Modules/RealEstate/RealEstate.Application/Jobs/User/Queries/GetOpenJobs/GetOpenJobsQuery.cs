using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Jobs.User.Queries.GetOpenJobs;

// Public Careers listing — open roles only. Department mirrors the filter chips on the page;
// null (the default) means "All Departments".
public sealed record GetOpenJobsQuery(string? Department = null) : IQuery<IReadOnlyList<JobDto>>;
