
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class PropertyFeatureConfiguration : IEntityTypeConfiguration<PropertyFeature>
{
    public void Configure(EntityTypeBuilder<PropertyFeature> builder)
    {
        builder.ToTable("PropertyFeatures");
        builder.HasKey(f => f.Id);

        builder.Property(f => f.Value).HasMaxLength(200);

        builder.HasOne<Feature>()
               .WithMany()
               .HasForeignKey(f => f.FeatureId)
               .OnDelete(DeleteBehavior.Restrict);   // can't delete a catalog Feature still in use

        // A property may carry each catalog feature at most once — enforced in the aggregate,
        // guaranteed by the database.
        builder.HasIndex(f => new { f.PropertyId, f.FeatureId })
               .IsUnique()
               .HasDatabaseName("UX_PropertyFeature_NoDuplicates");
    }
}