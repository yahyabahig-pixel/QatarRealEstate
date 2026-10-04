using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Auth.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Adds auth.SeedHistory — the Auth module's own copy of the seed-run ledger, so the default
    /// positions are inserted once and a position an admin deletes afterwards stays deleted.
    ///
    /// Separate table from realestate.SeedHistory on purpose: separate module, separate
    /// DbContext, separate migration history. See AuthSeedHistoryEntry.
    ///
    /// Data-safe: creates one new table, touches nothing that exists.
    /// </summary>
    public partial class AuthSeedHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SeedHistory",
                schema: "auth",
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
                schema: "auth");
        }
    }
}
