using BuildingBlocks.Domain.Common.Results.Errors;
using FluentValidation;
using MediatR;

// Namespace deliberately kept as BuildingBlocks.Application.Behaviors: it is what the modules
// already imported when each of them carried its own copy of this class.
namespace BuildingBlocks.Application.Behaviors;

// ---------------------------------------------------------------------------------------------
//  Runs every FluentValidation validator registered for the request, collects ALL failures, and
//  short-circuits as a failed Result before the handler runs.
//
//  ONE class for the whole application. There used to be three: a copy inside RealEstate, a copy
//  inside Auth, and an unused one here — and both modules registered their own open generic in
//  the same container. MediatR resolves open generics from the whole container, so every single
//  request went through validation twice: every validator executed twice, for nothing.
//
//  Registered exactly once, in the Host. A module does not register a shared pipeline behaviour;
//  the composition root does.
// ---------------------------------------------------------------------------------------------
public sealed class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
    where TResponse : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
        => _validators = validators;

    public async Task<TResponse> Handle(
        TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (!_validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);

        var results = await Task.WhenAll(
            _validators.Select(validator => validator.ValidateAsync(context, cancellationToken)));

        var errors = results
            .Where(result => !result.IsValid)
            .SelectMany(result => result.Errors)
            .Select(failure => Error.Validation(failure.PropertyName, failure.ErrorMessage))
            .ToList();

        if (errors.Count == 0)
            return await next();

        // Relies on the implicit operator List<Error> -> Result<T> (ErrorOr-style).
        return (TResponse)(dynamic)errors;
    }
}
