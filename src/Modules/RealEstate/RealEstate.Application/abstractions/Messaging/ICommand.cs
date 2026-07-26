using BuildingBlocks.Domain.Common.Results;
using MediatR;

namespace RealEstate.Application.Abstractions.Messaging;

// Commands always return a Result<T>. For "no payload" commands, use a marker:
// ICommand<Updated>, ICommand<Created>, ICommand<Deleted>.
public interface ICommand<TResponse> : IRequest<Result<TResponse>>;
