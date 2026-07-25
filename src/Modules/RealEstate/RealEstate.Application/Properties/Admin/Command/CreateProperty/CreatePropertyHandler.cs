
using RealEstate.Application.Abstractions.Persistence;

public sealed class CreatePropertyHandler : ICommandHandler<CreatePropertyCommand, Guid>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyAuthorizationPolicy _authorization;
