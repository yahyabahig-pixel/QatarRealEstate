// Data/Configurations/PropertyStatusHistoryConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class PropertyStatusHistoryConfiguration : IEntityTypeConfiguration<PropertyStatusHistory>
{
    public void Configure(EntityTypeBuilder<PropertyStatusHistory> builder)
    {
        builder.ToTable("PropertyStatusHistory");
        builder.HasKey(h => h.Id);

        builder.Property(h => h.OldStatus).HasConversion<int?>();
        builder.Property(h => h.NewStatus).HasConversion<int>();
        builder.Property(h => h.Reason).HasMaxLength(500);

        builder.HasOne<Property>()
               .WithMany()
               .HasForeignKey(h => h.PropertyId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(h => h.PropertyId);
    }
}