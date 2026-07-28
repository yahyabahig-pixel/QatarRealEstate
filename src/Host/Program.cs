using Host.ErrorHandling;
using Host.Middleware;
using Host.OpenApi;
using RealEstate.Api;
using RealEstate.Application;
using RealEstate.Infrastructure;
using RealEstate.Infrastructure.Data.Seeding;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

// ---- structured logging (Serilog) ----------------------------------------------------
// Replaces the default logger. Every log line is enriched from LogContext, which is
// where RequestLogContextMiddleware pushes the CorrelationId.
builder.Host.UseSerilog((context, configuration) => configuration
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console(
        outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {CorrelationId} {Message:lj}{NewLine}{Exception}"));

// ---- the RealEstate module, layer by layer -------------------------------------------
builder.Services.AddApplication();                                   // MediatR + validators + policies
builder.Services.AddRealEstateInfrastructure(builder.Configuration); // DbContext + repos + queries
builder.Services.AddRealEstateApi();                                 // controllers + JSON options

// ---- the safety net -------------------------------------------------------------------
builder.Services.AddProblemDetails();                                // the ProblemDetails writer
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();      // last-resort 500

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<VersionInfoTransformer>();        // titled docs
    // Uncomment both lines when the Auth module lands:
    // options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
    // options.AddOperationTransformer<BearerSecuritySchemeTransformer>();
});

var app = builder.Build();

app.UseMiddleware<RequestLogContextMiddleware>();  // FIRST — stamps everything after it
app.UseExceptionHandler();                          // activates GlobalExceptionHandler
app.UseSerilogRequestLogging();                     // one summary log line per request

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                          // OpenAPI JSON at /openapi/v1.json
    await app.Services.SeedRealEstateAsync();  // idempotent — safe on every startup
}

app.UseHttpsRedirection();

// When the Auth module arrives, its two lines land exactly here:
//   app.UseAuthentication();
//   app.UseAuthorization();

app.MapControllers();

app.Run();
