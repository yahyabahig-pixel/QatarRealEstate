using BuildingBlocks.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using RealEstate.Application.Abstractions.Authentication;

namespace RealEstate.Infrastructure.Data.Interceptors;

public sealed class AuditableEntityInterceptor : SaveChangesInterceptor
{

    private readonly ICurrentUser _user;
    private readonly TimeProvider _dateTime; public AuditableEntityInterceptor(ICurrentUser user, TimeProvider dateTime)
    {
        _user = user;
        _dateTime = dateTime;
    }

    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData, InterceptionResult<int> result)
    {
        UpdateEntities(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        UpdateEntities(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void UpdateEntities(DbContext? context)
    {
        if (context is null) return;

        var utcNow = _dateTime.GetUtcNow().UtcDateTime;
        var userId = _user.IsAuthenticated ? _user.UserId : (Guid?)null;

        foreach (var entry in context.ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State is EntityState.Added or EntityState.Modified || entry.HasChangedOwnedEntities())
            {
                if (entry.State == EntityState.Added)
                {
                    entry.Entity.CreatedBy = userId;
                    entry.Entity.CreatedAtUtc = utcNow;
                }

                // Never touch CreatedBy/CreatedAtUtc on updates — only "last modified".
                entry.Entity.LastModifiedBy = userId;
                entry.Entity.LastModifiedUtc = utcNow;
            }
        }
    }
}
public static class ChangeTrackerExtensions
{
    // An aggregate whose OWNED value object changed (e.g. Property.Location replaced) should
    // count as "modified" even though the root's own scalar columns didn't change.
    public static bool HasChangedOwnedEntities(this EntityEntry entry) =>
        entry.References.Any(r =>
            r.TargetEntry is not null &&
            r.TargetEntry.Metadata.IsOwned() &&
            r.TargetEntry.State is EntityState.Added or EntityState.Modified);
}