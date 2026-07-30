using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Developments.Admin.Queries.GetDevelopmentById;

// Admin detail — also the route target for the 201 Location header from Create.
public sealed record GetDevelopmentByIdQuery(Guid Id) : IQuery<DevelopmentDto>;
