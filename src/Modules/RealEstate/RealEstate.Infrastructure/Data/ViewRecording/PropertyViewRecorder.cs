using BuildingBlocks.Domain.Common.Results;
using BuildingBlocks.Domain.Common.Results.Errors;
using Microsoft.EntityFrameworkCore;

namespace RealEstate.Infrastructure.Data.ViewRecording;

public sealed class PropertyViewRecorder : IPropertyViewRecorder
{
    private readonly RealEstateDbContext _db;
    public PropertyViewRecorder(RealEstateDbContext db) => _db = db;
    public async Task<Result<Updated>> RecordAsync(Guid propertyId, CancellationToken ct = default)
    {
        // UPDATE realestate.Properties SET ViewsCount = ViewsCount + 1 WHERE Id = @id
        var rows = await _db.Properties
            .Where(p => p.Id == propertyId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.ViewsCount, p => p.ViewsCount + 1), ct);
        return rows == 0
            ? Error.NotFound("Property.NotFound", "Property was not found.")
            : Result.Updated;
    }
}
