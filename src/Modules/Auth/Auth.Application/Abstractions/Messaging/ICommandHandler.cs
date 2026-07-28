using BuildingBlocks.Domain.Common.Results;
using MediatR;

namespace Auth.Application.Abstractions.Messaging;

public interface ICommandHandler<TCommand, TResponse> : IRequestHandler<TCommand, Result<TResponse>>
    where TCommand : ICommand<TResponse>;
