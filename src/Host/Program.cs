using Auth.Api;
using Auth.Application;
using Auth.Infrastructure;
using Auth.Infrastructure.Data.Seeding;
using BuildingBlocks.Authorization;
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

// ---- the Auth module, layer by layer --------------------------------------------------
builder.Services.AddAuthApplication();                               // MediatR + validators
builder.Services.AddAuthInfrastructure(builder.Configuration);       // Identity + JWT + AuthDbContext
builder.Services.AddAuthApi();                                       // controllers

// ---- authorization: permission policies for ALL modules -------------------------------
builder.Services.AddPermissionAuthorization();

// ---- the safety net -------------------------------------------------------------------
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<VersionInfoTransformer>();
});

var app = builder.Build();

app.UseMiddleware<RequestLogContextMiddleware>();  // FIRST — stamps everything after it
app.UseExceptionHandler();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    await app.Services.SeedAuthAsync();            // roles → Main Admin → positions
    await app.Services.SeedRealEstateAsync();      // property types → features → listings
}

app.UseHttpsRedirection();

app.UseAuthentication();   // who are you?  (validates the JWT, fills HttpContext.User)
app.UseAuthorization();    // may you?      (permission policies + [Authorize])

app.MapControllers();

app.Run();
