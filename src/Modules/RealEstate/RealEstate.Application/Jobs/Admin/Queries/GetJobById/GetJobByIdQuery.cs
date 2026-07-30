using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Jobs.Admin.Queries.GetJobById;

// Admin detail — also the route target for the 201 Location header from Create.
public sealed record GetJobByIdQuery(Guid Id) : IQuery<JobDto>;
