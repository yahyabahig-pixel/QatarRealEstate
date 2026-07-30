using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Jobs.Admin.Queries.ListJobsForAdmin;

// Admin sees every advert, open and closed. Department is optional — null means all departments.
public sealed record ListJobsForAdminQuery(string? Department = null) : IQuery<IReadOnlyList<JobDto>>;
