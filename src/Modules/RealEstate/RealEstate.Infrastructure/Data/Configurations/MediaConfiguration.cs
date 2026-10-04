using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class MediaConfiguration : IEntityTypeConfiguration<Media>
{
    public void Configure(EntityTypeBuilder<Media> builder)
    {
        builder.ToTable("PropertyMedia");
        builder.HasKey(m => m.Id);

        // THE APPLICATION GENERATES THIS KEY, NOT THE DATABASE.
        //
        // Media.Create assigns the Id, because Property.ReorderMedia identifies photos by it
        // and two unsaved Media objects are otherwise indistinguishable. Without this line EF
        // keeps its default for a Guid key — ValueGeneratedOnAdd — and then reads "the key is
        // already set" as "this row already exists". New photos reached SaveChanges through
        // the tracked Property's collection, so EF resolved them to Modified and emitted
        //
        //     UPDATE realestate.PropertyMedia SET ... WHERE Id = @p
        //
        // against rows that had never been inserted. Nothing was written, and adding photos to
        // any listing failed with DbUpdateConcurrencyException ("expected to affect 1 row(s),
        // but actually affected 0").
        //
        // No column changes: ValueGenerated is model metadata, so the accompanying migration
        // is empty by design and exists only to move the snapshot forward.
        builder.Property(m => m.Id).ValueGeneratedNever();

        builder.Property(m => m.Url).HasMaxLength(2000).IsRequired();
        builder.Property(m => m.MediaType).HasMaxLength(50).IsRequired();

        // FK column type comes from Media.PropertyId — MUST be Guid (blocker B1).
        builder.HasIndex(m => m.PropertyId);
        builder.HasIndex(m => new { m.PropertyId, m.IsPrimary })
               .HasDatabaseName("IX_Media_PrimaryPerProperty");
    }
}