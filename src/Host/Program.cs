using Auth.Api;
using Auth.Application;
using Auth.Infrastructure;
using Auth.Infrastructure.Data.Seeding;
using BuildingBlocks.Authorization;
using Host.ErrorHandling;
using Host.Middleware;
using Host.OpenApi;
using Host.Startup;
using Microsoft.AspNetCore.DataProtection;
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

// ---- data protection ------------------------------------------------------------------
// Identity protects its password-reset and email-confirmation tokens - and the antiforgery
// cookie - with a key ring. Left to itself the framework writes that ring under the
// container user's home directory, which is part of the container's writable layer and is
// therefore thrown away on every rebuild: outstanding tokens stop validating, and each
// restart logs "No XML encryptor configured".
//
// DataProtection:KeyRingPath points at a directory backed by a named volume (see
// docker-compose.yml). It is deliberately left unset outside containers, so `dotnet run` on
// a dev machine keeps the framework default and local behaviour is unchanged.
//
// SetApplicationName is not optional here: without it the ring is isolated by content-root
// path, so the same keys silently stop matching if the app is ever published elsewhere.
var dataProtection = builder.Services
    .AddDataProtection()
    .SetApplicationName("QatarRealEstate");

var keyRingPath = builder.Configuration["DataProtection:KeyRingPath"];
if (!string.IsNullOrWhiteSpace(keyRingPath))
{
    // CreateDirectory is idempotent, and doing it here means a bad mount or a permission
    // mistake fails loudly at startup rather than on the first password-reset request.
    dataProtection.PersistKeysToFileSystem(Directory.CreateDirectory(keyRingPath));
}

// ---- authorization: permission policies for ALL modules -------------------------------
builder.Services.AddPermissionAuthorization();

// ---- CORS: let the React dev server (a different origin) call this API ----------------
// Browsers block cross-origin fetches unless the server opts in. Origins come from
// "Cors:AllowedOrigins" in appsettings; the fallback covers Vite's default dev ports.
// AllowAnyHeader is needed for Authorization + Content-Type on the JWT'd admin calls.
const string FrontendCorsPolicy = "Frontend";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

builder.Services.AddCors(options =>
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()));

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
}

// ---- database bootstrap --------------------------------------------------------------
// Driven by configuration instead of by environment, so the SAME published image can be
// told to migrate and seed in production. Both flags default to the old Development-only
// behaviour, so running locally is completely unchanged.
if (app.Configuration.GetValue("Startup:ApplyMigrations", app.Environment.IsDevelopment()))
{
    await app.MigrateDatabaseAsync();
}

if (app.Configuration.GetValue("Startup:SeedData", app.Environment.IsDevelopment()))
{
    await app.Services.SeedAuthAsync();            // roles → Main Admin → positions
    await app.Services.SeedRealEstateAsync();      // property types → features → listings
}

// ---- https redirection ---------------------------------------------------------------
// Behind the nginx container the site is served as plain HTTP on a bare IP. Redirecting to
// https there would break every API call and fill the log with warnings about an undefined
// https port. Turn this back on with Startup__UseHttpsRedirection=true the day a domain and
// a certificate exist.
if (app.Configuration.GetValue("Startup:UseHttpsRedirection", !app.Environment.IsProduction()))
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);   // before auth: even 401s need the CORS headers

app.UseAuthentication();   // who are you?  (validates the JWT, fills HttpContext.User)
app.UseAuthorization();    // may you?      (permission policies + [Authorize])

app.MapControllers();

app.Run();
