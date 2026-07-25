
using BuildingBlocks.Domain.Common.Results;
using MediatR;

namespace RealEstate.Application.Abstractions.Messaging;

public interface IQuery<TResponse> : IRequest<Result<TResponse>>;