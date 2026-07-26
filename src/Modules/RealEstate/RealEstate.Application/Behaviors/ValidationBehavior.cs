using System.IO;
public sealed class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
    where TResponse : notnull
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;

    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }

    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (!_validators.Any())
            return await next();

        var context = new ValidationContext<TRequest>(request);

        var errors = _validators
            .Select(validator => validator.Validate(context))
            .Where(result => !result.IsValid)
            .SelectMany(result => result.Errors)
            .Select(failure => Error.Validation(failure.PropertyName, failure.ErrorMessage))
            .ToList();

        if (errors.Count == 0)
            return await next();

        // Relies on the implicit operator List<Error> -> Result<T> (ErrorOr-style).
        // If your Result exposes a different failure factory, replace this one line.
        return (TResponse)(dynamic)errors;
    }
}