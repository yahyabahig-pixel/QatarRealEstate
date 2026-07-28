using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace BuildingBlocks.Api.Errors;

// The ONE place where Result<T> becomes HTTP — for every module.
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

    // ---- error translation --------------------------------------------------------------

    public static IActionResult ToProblem(this List<Error> errors)
    {
        if (errors.Count == 0)
            return new ObjectResult(new ProblemDetails { Status = StatusCodes.Status500InternalServerError })
            { StatusCode = StatusCodes.Status500InternalServerError };

        if (errors.All(error => error.Type == ErrorKind.Validation))
            return ValidationProblem(errors);

        return Problem(errors[0]);
    }

    private static IActionResult Problem(Error error)
    {
        var statusCode = error.Type switch
        {
            ErrorKind.Validation   => StatusCodes.Status400BadRequest,
            ErrorKind.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorKind.Forbidden    => StatusCodes.Status403Forbidden,
            ErrorKind.NotFound     => StatusCodes.Status404NotFound,
            ErrorKind.Conflict     => StatusCodes.Status409Conflict,
            _                      => StatusCodes.Status500InternalServerError
        };

        var problem = new ProblemDetails
        {
            Status = statusCode,
            Title = error.Type switch
            {
                ErrorKind.Unauthorized => "Unauthorized",
                ErrorKind.Forbidden    => "Forbidden",
                ErrorKind.NotFound     => "Not Found",
                ErrorKind.Conflict     => "Conflict",
                _                      => "Server error"
            }
        };

        problem.Extensions["errors"] = new[] { new { code = error.Code, description = error.Description } };

        return new ObjectResult(problem) { StatusCode = statusCode };
    }

    private static IActionResult ValidationProblem(List<Error> errors)
    {
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
