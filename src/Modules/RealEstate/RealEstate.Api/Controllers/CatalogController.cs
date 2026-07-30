using Microsoft.AspNetCore.Mvc;
using BuildingBlocks.Api.Controllers;
using BuildingBlocks.Api.Errors;
using RealEstate.Application.Catalog.User.Queries.GetFeatureCatalog;
using RealEstate.Application.Catalog.User.Queries.GetPropertyTypes;

namespace RealEstate.Api.Controllers;

// Public reference data — anonymous on purpose. The search filters need property types
// before anyone logs in, and both catalogs already leak through every property details
// response anyway.
[Route("api/catalog")]
public sealed class CatalogController : ApiControllerBase
{
    // GET /api/catalog/property-types
    [HttpGet("property-types")]
    public async Task<IActionResult> PropertyTypes(CancellationToken ct)
        => (await Sender.Send(new GetPropertyTypesQuery(), ct)).ToOk();

    // GET /api/catalog/features
    [HttpGet("features")]
    public async Task<IActionResult> Features(CancellationToken ct)
        => (await Sender.Send(new GetFeatureCatalogQuery(), ct)).ToOk();
}
