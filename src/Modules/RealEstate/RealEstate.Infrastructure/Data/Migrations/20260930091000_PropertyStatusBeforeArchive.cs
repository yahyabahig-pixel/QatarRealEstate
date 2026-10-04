using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Adds Properties.StatusBeforeArchive.
    ///
    /// WHY: Publish() refuses a Sold or Rented listing, but Archive() accepted one and
    /// Publish() accepted an archived one — so "Sold → Archive → Publish" was two legal steps
    /// that together put a closed deal back on the market. Remembering where the archive came
    /// from is what lets Publish() tell the two kinds of archived listing apart.
    ///
    /// Data-safe: one nullable column, no default. NULL on every existing row means "archived
    /// from Draft or Published", which is exactly how those rows behave today.
    /// </summary>
    public partial class PropertyStatusBeforeArchive : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "StatusBeforeArchive",
                schema: "realestate",
                table: "Properties",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StatusBeforeArchive",
                schema: "realestate",
                table: "Properties");
        }
    }
}
