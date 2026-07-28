using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DevelopmentLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Same owned-Location column layout Properties already use. Required columns are
            // added NOT NULL with '' defaults, then immediately backfilled from AreaName.
            migrationBuilder.AddColumn<string>(name: "Location_Country", schema: "realestate", table: "Developments", type: "nvarchar(100)", maxLength: 100, nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "Location_City", schema: "realestate", table: "Developments", type: "nvarchar(100)", maxLength: 100, nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "Location_Street", schema: "realestate", table: "Developments", type: "nvarchar(200)", maxLength: 200, nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "Location_PostalCode", schema: "realestate", table: "Developments", type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "Location_State", schema: "realestate", table: "Developments", type: "nvarchar(100)", maxLength: 100, nullable: false, defaultValue: "");
            migrationBuilder.AddColumn<string>(name: "Location_X", schema: "realestate", table: "Developments", type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "0");
            migrationBuilder.AddColumn<string>(name: "Location_Y", schema: "realestate", table: "Developments", type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "0");
            migrationBuilder.AddColumn<string>(name: "Location_Description", schema: "realestate", table: "Developments", type: "nvarchar(500)", maxLength: 500, nullable: true);

            // Backfill: the old AreaName becomes street + state; known seed areas also get
            // real coordinates (X = longitude, Y = latitude) so their detail maps work
            // immediately. Unknown areas keep 0/0, which the frontend treats as "no exact
            // location yet".
            migrationBuilder.Sql(@"
UPDATE realestate.Developments
   SET Location_Country = N'Qatar',
       Location_City = N'Doha',
       Location_Street = AreaName,
       Location_State = AreaName,
       Location_PostalCode = N'00000',
       Location_X = CASE AreaName
            WHEN N'The Pearl' THEN N'51.5504'
            WHEN N'Lusail Marina District' THEN N'51.5450'
            WHEN N'Qetaifan Island' THEN N'51.5583'
            WHEN N'Fox Hills' THEN N'51.4904'
            WHEN N'West Bay' THEN N'51.5310'
            WHEN N'Msheireb' THEN N'51.5264'
            WHEN N'Al Waab' THEN N'51.4400'
            ELSE N'0' END,
       Location_Y = CASE AreaName
            WHEN N'The Pearl' THEN N'25.3705'
            WHEN N'Lusail Marina District' THEN N'25.4300'
            WHEN N'Qetaifan Island' THEN N'25.4680'
            WHEN N'Fox Hills' THEN N'25.4106'
            WHEN N'West Bay' THEN N'25.3211'
            WHEN N'Msheireb' THEN N'25.2867'
            WHEN N'Al Waab' THEN N'25.3210'
            ELSE N'0' END;
");

            migrationBuilder.DropColumn(name: "AreaName", schema: "realestate", table: "Developments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(name: "AreaName", schema: "realestate", table: "Developments", type: "nvarchar(200)", maxLength: 200, nullable: false, defaultValue: "");

            migrationBuilder.Sql(@"
UPDATE realestate.Developments SET AreaName = Location_State;");

            migrationBuilder.DropColumn(name: "Location_Country", schema: "realestate", table: "Developments");
            migrationBuilder.DropColumn(name: "Location_City", schema: "realestate", table: "Developments");
            migrationBuilder.DropColumn(name: "Location_Street", schema: "realestate", table: "Developments");
            migrationBuilder.DropColumn(name: "Location_PostalCode", schema: "realestate", table: "Developments");
            migrationBuilder.DropColumn(name: "Location_State", schema: "realestate", table: "Developments");
            migrationBuilder.DropColumn(name: "Location_X", schema: "realestate", table: "Developments");
            migrationBuilder.DropColumn(name: "Location_Y", schema: "realestate", table: "Developments");
            migrationBuilder.DropColumn(name: "Location_Description", schema: "realestate", table: "Developments");
        }
    }
}
