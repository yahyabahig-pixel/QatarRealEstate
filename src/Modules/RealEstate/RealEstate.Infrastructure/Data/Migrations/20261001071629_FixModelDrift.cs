using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations
{
    /// <summary>
    /// DELIBERATELY EMPTY. The database needs nothing from this migration.
    ///
    /// The three migrations before this one were written BY HAND, because `dotnet ef` could not
    /// run in the environment they were written in. Their SQL was correct — EF generated this
    /// one against the same database and found no schema difference at all, which is why Up()
    /// and Down() are blank.
    ///
    /// What was NOT correct was the hand-copied RealEstateDbContextModelSnapshot. EF compares
    /// that snapshot against the live model on every startup, and the mismatch made it throw
    /// PendingModelChangesWarning — "the model has pending changes" — and the API exited before
    /// it ever listened, with nginx answering 502. The schema was fine the whole time; only the
    /// bookkeeping was off.
    ///
    /// This migration exists so that the regenerated snapshot has something to belong to.
    /// Removing it with `ef migrations remove` would roll the snapshot back to the broken
    /// hand-written one and the API would stop booting again.
    ///
    /// The lesson, recorded here because it will be tempting to repeat: generate migrations with
    /// `dotnet ef`, never by hand. If the tool is unavailable, run it in a container:
    ///
    ///     docker run --rm -v "$PWD":/src -w /src mcr.microsoft.com/dotnet/sdk:10.0 bash -c "
    ///       dotnet restore src/Host/Host.csproj &amp;&amp;
    ///       dotnet tool install dotnet-ef --tool-path /tmp/t &amp;&amp;
    ///       /tmp/t/dotnet-ef migrations add &lt;Name&gt; \
    ///         --project src/Modules/RealEstate/RealEstate.Infrastructure \
    ///         --startup-project src/Host --context RealEstateDbContext \
    ///         --output-dir Data/Migrations"
    /// </summary>
    public partial class FixModelDrift : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
