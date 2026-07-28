using Serilog.Context;

namespace Host.Middleware;

// Pushes the request's correlation id into the Serilog LogContext, so EVERY structured
// log line written during the lifetime of this HTTP request carries the same id —
// from any layer: handlers, EF Core, the exception handler, all of it.
public sealed class RequestLogContextMiddleware
{
    private readonly RequestDelegate _next;

    public RequestLogContextMiddleware(RequestDelegate next) => _next = next;

    public Task InvokeAsync(HttpContext httpContext)
    {
        // TraceIdentifier is ASP.NET's built-in per-request id. PushProperty puts it into
        // an AsyncLocal stack that flows through await; the using pops it at request end.
        using (LogContext.PushProperty("CorrelationId", httpContext.TraceIdentifier))
        {
            return _next(httpContext);
        }
    }
}
