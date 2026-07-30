using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Areas.Admin.Queries.GetAreaById;

// Admin detail — also the route target for the 201 Location header from Create.
public sealed record GetAreaByIdQuery(Guid Id) : IQuery<AreaDto>;
