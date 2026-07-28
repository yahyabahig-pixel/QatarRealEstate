using Auth.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Auth.Infrastructure.Data.Configurations;

public sealed class PositionPermissionConfiguration : IEntityTypeConfiguration<PositionPermission>
{
    public void Configure(EntityTypeBuilder<PositionPermission> builder)
    {
        builder.ToTable("PositionPermissions");
        builder.HasKey(pp => pp.Id);

        builder.Property(pp => pp.PermissionName).HasMaxLength(100).IsRequired();

        // A position carries each permission at most once — aggregate rule, DB guarantee.
        builder.HasIndex(pp => new { pp.PositionId, pp.PermissionName })
               .IsUnique()
               .HasDatabaseName("UX_PositionPermission_NoDuplicates");
    }
}
