namespace RealEstate.Api.Errors;

using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace RealEstate.Api.Errors;

// The ONE place where Result<T> becomes HTTP. No controller builds a status code by hand.
public static class ResultExtensions
{
    // ---- the three shapes controllers actually use ------------------------------------

    /// <summary>200 OK with the value — for queries.</summary>
    public static IActionResult ToOk<T>(this Result<T> result)
        => result.IsSuccess ? new OkObjectResult(result.Value) : result.Errors.ToProblem();

    /// <summary>204 No Content — for commands returning Updated/Deleted markers.</summary>
    public static IActionResult ToNoContent<T>(this Result<T> result)
        => result.IsSuccess ? new NoContentResult() : result.Errors.ToProblem();

    /// <summary>201 Created with a Location header — for commands returning a new id.</summary>
    public static IActionResult ToCreatedAtRoute(
        this Result<Guid> result, string routeName, Func<Guid, object> routeValues)
        => result.IsSuccess
            ? new CreatedAtRouteResult(routeName, routeValues(result.Value), new { id = result.Value })
            : result.Errors.ToProblem();

    // ---- error translation (your ProblemExtensions, adapted) ---------------------------

    public static IActionResult ToProblem(this List<Error> errors)
    {
        // Defensive: a failed Result always has at least one error, but never trust that in HTTP code.
        if (errors.Count == 0)
            return new ObjectResult(new ProblemDetails { Status = StatusCodes.Status500InternalServerError })
            { StatusCode = StatusCodes.Status500InternalServerError };

        // The common case: ValidationBehavior collected FluentValidation failures.
        // Report ALL of them, keyed by field, in the standard shape.
        if (errors.All(error => error.Type == ErrorKind.Validation))
            return ValidationProblem(errors);

        // Otherwise the first error decides the status.
        return Problem(errors[0]);
    }

    private static IActionResult Problem(Error error)
    {
        var statusCode = error.Type switch
        {
            ErrorKind.Validation => StatusCodes.Status400BadRequest,
            ErrorKind.Unauthorized => StatusCodes.Status401Unauthorized,   // "who are you?"
            ErrorKind.Forbidden => StatusCodes.Status403Forbidden,      // "not you."
            ErrorKind.NotFound => StatusCodes.Status404NotFound,
            ErrorKind.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError
        };

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = error.Type switch
            {
                ErrorKind.Unauthorized => "Unauthorized",
                ErrorKind.Forbidden => "Forbidden",
                ErrorKind.NotFound => "Not Found",
                ErrorKind.Conflict => "Conflict",
                _ => "Server error"
            }
        };

        // Keep the machine-readable code — clients switch on codes, not sentences.
        problem.Extensions["errors"] = new[] { new { code = error.Code, description = error.Description } };

        return new ObjectResult(problem) { StatusCode = statusCode };
    }

    private static IActionResult ValidationProblem(List<Error> errors)
    {
        // GroupBy, NOT ToDictionary: two rules on the same field are normal
        // ("Title too short" + "Title must not contain X") and duplicate keys must not crash.
        var errorsDict = errors
            .GroupBy(e => e.Code)
            .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray());

        var problemDetails = new ValidationProblemDetails(errorsDict)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Validation failed"
        };

        return new ObjectResult(problemDetails) { StatusCode = StatusCodes.Status400BadRequest };
    }
}