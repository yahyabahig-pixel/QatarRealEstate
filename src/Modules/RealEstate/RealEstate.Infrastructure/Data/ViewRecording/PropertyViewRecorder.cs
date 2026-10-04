using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using Microsoft.EntityFrameworkCore;
using RealEstate.Domain.Enums;

namespace RealEstate.Infrastructure.Data.ViewRecording;

public sealed class PropertyViewRecorder : IPropertyViewRecorder
{
    private readonly RealEstateDbContext _db;
    public PropertyViewRecorder(RealEstateDbContext db) => _db = db;

    public async Task<Result<Updated>> RecordAsync(Guid propertyId, CancellationToken ct = default)
    {
        // UPDATE realestate.Properties SET ViewsCount = ViewsCount + 1
        // WHERE Id = @id AND Status = Published AND IsActive = 1
        //
        // The status predicate is not decoration. POST /{id}/views is anonymous, so without it
        // anyone could keep incrementing the counter of a listing that is not even published —
        // and the "Most viewed" dashboard would rank a draft nobody can open.
        var rows = await _db.Properties
            .Where(p => p.Id == propertyId && p.Status == PropertyStatus.Published && p.IsActive)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.ViewsCount, p => p.ViewsCount + 1), ct);

        return rows == 0
            ? Error.NotFound("Property.NotFound", "Property was not found.")
            : Result.Updated;
    }
}
