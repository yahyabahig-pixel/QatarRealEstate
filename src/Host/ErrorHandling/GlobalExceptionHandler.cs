using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Host.ErrorHandling;

// IExceptionHandler is the .NET 8+ replacement for hand-rolled exception middleware.
// It runs when NOTHING else caught the exception — the last line of defense.
// Expected failures never reach this class: they flow as Result<T> through the mapper.
public sealed class GlobalExceptionHandler(
    IProblemDetailsService problemDetailsService,
    IHostEnvironment env,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        // Full details go to the log (with the CorrelationId pushed by
        // RequestLogContextMiddleware), NOT to the client.
        logger.LogError(exception, "Unhandled exception on {Path}", httpContext.Request.Path);

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Title = "Application error",
                // Exception messages routinely leak internals (connection strings,
                // table names, file paths) — strangers get specifics only in Development.
                Detail = env.IsDevelopment() ? exception.Message : "An unexpected error occurred.",
            }
        });
    }
}
