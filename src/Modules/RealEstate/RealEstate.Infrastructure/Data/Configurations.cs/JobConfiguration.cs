using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class JobConfiguration : IEntityTypeConfiguration<Job>
{
    public void Configure(EntityTypeBuilder<Job> builder)
    {
        builder.ToTable("Jobs");
        builder.HasKey(j => j.Id);

        // Lengths match CreateJobValidator / UpdateJobValidator exactly, so the API is always the
        // thing that rejects an oversized payload — the database never has to.
        builder.Property(j => j.Title).HasMaxLength(200).IsRequired();
        builder.Property(j => j.Department).HasMaxLength(100).IsRequired();
        builder.Property(j => j.EmploymentType).HasMaxLength(60).IsRequired();
        builder.Property(j => j.Location).HasMaxLength(200).IsRequired();
        builder.Property(j => j.Description).HasMaxLength(4000).IsRequired();

        builder.Property(j => j.IsActive).HasDefaultValue(true);

        // NO unique index on Title — unlike Agent/Area/Development a job has no public URL, so two
        // offices may advertise "Senior Sales Consultant" at the same time and both are valid.

        // The public Careers page always filters on IsActive, and usually on Department right after
        // it — one composite index serves both the unfiltered list and the per-department chips.
        builder.HasIndex(j => new { j.IsActive, j.Department })
               .HasDatabaseName("IX_Jobs_IsActive_Department");
    }
}
