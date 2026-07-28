using Auth.Application.Abstractions.Messaging;
using Auth.Application.Abstractions.Persistence;
using Auth.Domain.DomainErrors;
using Auth.Domain.Entities;
using BuildingBlocks.Domain.Common.Results;

namespace Auth.Application.Positions.CreatePosition;

public sealed class CreatePositionHandler : ICommandHandler<CreatePositionCommand, Guid>
{
    private readonly IPositionRepository _positions;
    private readonly IAuthUnitOfWork _unitOfWork;

    public CreatePositionHandler(IPositionRepository positions, IAuthUnitOfWork unitOfWork)
    {
        _positions = positions;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreatePositionCommand request, CancellationToken ct)
    {
        if (await _positions.ExistsByNameAsync(request.Name, excludeId: null, ct))
            return PositionErrors.DuplicateName;

        var position = Position.Create(request.Name, request.Description);
        if (position.IsError) return position.TopError;

        await _positions.AddAsync(position.Value, ct);
        await _unitOfWork.SaveChangesAsync(ct);
        return position.Value.Id;
    }
}
