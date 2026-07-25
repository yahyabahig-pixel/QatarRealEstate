
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Properties.Admin.Command.CreateProperty;

public sealed class CreatePropertyHandler : ICommandHandler<CreatePropertyCommand, Guid>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork _unitOfWork;
    private readonly PropertyAuthorizationPolicy _authorization;

    public Task<Result<Guid>> Handle(CreatePropertyCommand request, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }
}