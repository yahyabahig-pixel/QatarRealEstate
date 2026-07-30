using Auth.Domain.Entities;
using Auth.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Auth.Infrastructure.Data.Configurations;

public sealed class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.Property(u => u.FullName).HasMaxLength(200).IsRequired();
        builder.Property(u => u.IsActive).HasDefaultValue(true);
        builder.Property(u => u.IsMainAdmin).HasDefaultValue(false);

        // THE invariant: at most ONE Main Admin — enforced by the database itself.
        builder.HasIndex(u => u.IsMainAdmin)
               .HasFilter("[IsMainAdmin] = 1")
               .IsUnique()
               .HasDatabaseName("UX_Users_SingleMainAdmin");

        // Position is optional; deleting a position in use is blocked in the handler,
        // and Restrict makes the database agree.
        builder.HasOne<Position>()
               .WithMany()
               .HasForeignKey(u => u.PositionId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(u => u.PositionId);
    }
}
