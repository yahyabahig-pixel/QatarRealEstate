using Auth.Application.Abstractions.Authentication;
using BuildingBlocks.Domain.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Auth.Infrastructure.Data.Interceptors;

// Same job as RealEstate's AuditableEntityInterceptor, for the Auth context.
// Interceptors are per-DbContext, so each module wires its own — without this,
// every Position row would carry CreatedAtUtc = 0001-01-01 forever (silently).
public sealed class AuthAuditInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentAdmin _caller;
    private readonly TimeProvider _clock;

    public AuthAuditInterceptor(ICurrentAdmin caller, TimeProvider clock)
    {
        _caller = caller;
        _clock = clock;
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

        var utcNow = _clock.GetUtcNow();
        var userId = _caller.IsAuthenticated ? _caller.UserId : (Guid?)null;

        foreach (var entry in context.ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedBy = userId;
                entry.Entity.CreatedAtUtc = utcNow;
                entry.Entity.LastModifiedBy = userId;
                entry.Entity.LastModifiedUtc = utcNow;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.LastModifiedBy = userId;
                entry.Entity.LastModifiedUtc = utcNow;
            }
        }
    }
}
