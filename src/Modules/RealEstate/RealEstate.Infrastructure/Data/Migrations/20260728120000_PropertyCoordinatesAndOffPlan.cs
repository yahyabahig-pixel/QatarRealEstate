using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class PropertyCoordinatesAndOffPlan : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "Latitude",
                schema: "realestate",
                table: "Properties",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Longitude",
                schema: "realestate",
                table: "Properties",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsOffPlan",
                schema: "realestate",
                table: "Properties",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // Backfill from the strings the Location value object already holds. TRY_CONVERT
            // returns NULL on junk instead of failing the whole migration, and the WHERE
            // clause makes sure a row with only one usable coordinate ends up with neither:
            // half a position is not a position. 0,0 is excluded because it is the
            // placeholder the admin form has been sending, not an address.
            migrationBuilder.Sql(@"
UPDATE realestate.Properties
   SET Latitude  = TRY_CONVERT(float, Location_Y),
       Longitude = TRY_CONVERT(float, Location_X)
 WHERE TRY_CONVERT(float, Location_Y) IS NOT NULL
   AND TRY_CONVERT(float, Location_X) IS NOT NULL
   AND TRY_CONVERT(float, Location_Y) BETWEEN -90  AND 90
   AND TRY_CONVERT(float, Location_X) BETWEEN -180 AND 180
   AND NOT (TRY_CONVERT(float, Location_Y) = 0 AND TRY_CONVERT(float, Location_X) = 0);
");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_LatLng",
                schema: "realestate",
                table: "Properties",
                columns: new[] { "Latitude", "Longitude" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Properties_LatLng",
                schema: "realestate",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "IsOffPlan",
                schema: "realestate",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Latitude",
                schema: "realestate",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Longitude",
                schema: "realestate",
                table: "Properties");
        }
    }
}
