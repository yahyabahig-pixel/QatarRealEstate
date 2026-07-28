using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;


namespace Host.OpenApi;

// Stamps each OpenAPI document with its own name — so /openapi/v1.json says "v1"
// instead of the assembly's default title. Becomes REQUIRED the day you serve
// more than one document (AddOpenApi("v1") + AddOpenApi("v2") with Asp.Versioning).
internal sealed class VersionInfoTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        var version = context.DocumentName;

        document.Info.Version = version;
        document.Info.Title = $"Qatar Real Estate API {version}";

        return Task.CompletedTask;
    }


}
