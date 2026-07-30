using BuildingBlocks.Domain.Common.Results;
using MediatR;

namespace Auth.Application.Abstractions.Messaging;

public interface ICommand<TResponse> : IRequest<Result<TResponse>>;
