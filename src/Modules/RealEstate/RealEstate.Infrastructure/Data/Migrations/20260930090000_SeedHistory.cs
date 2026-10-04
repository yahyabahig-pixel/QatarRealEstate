using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Adds realestate.SeedHistory — the ledger that records WHICH seed batches have run.
    ///
    /// WHY: the seeder was "idempotent by insert" (look for each catalog row, insert the ones
    /// that are missing). On a fresh database that is right; on a live one it makes deletion
    /// impossible, because a row an admin deleted is exactly a row the next startup inserts
    /// again. Recording the run instead of comparing the rows is what makes a delete final.
    ///
    /// Data-safe: creates one new table, touches nothing that exists.
    /// </summary>
    public partial class SeedHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SeedHistory",
                schema: "realestate",
                columns: table => new
                {
                    Key = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AppliedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SeedHistory", x => x.Key);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SeedHistory",
                schema: "realestate");
        }
    }
}
