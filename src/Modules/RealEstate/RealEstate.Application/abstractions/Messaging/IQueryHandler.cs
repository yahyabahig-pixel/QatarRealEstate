using BuildingBlocks.Domain.Common.Results;
using MediatR;

namespace RealEstate.Application.Abstractions.Messaging;

public interface IQueryHandler<in TQuery, TResponse>
    : IRequestHandler<TQuery, Result<TResponse>>
    where TQuery : IQuery<TResponse>;