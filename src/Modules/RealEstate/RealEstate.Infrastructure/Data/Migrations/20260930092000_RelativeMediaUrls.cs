using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations;

/// <summary>
/// Rewrites stored media URLs from absolute to relative.
///
/// A photo uploaded through the admin panel is served by this application at
/// /api/media/images/{id}. The frontend used to SAVE it as an absolute URL, built from
/// whatever address the bundle happened to be compiled against — so every photo uploaded
/// while the site ran on http://&lt;ip&gt; kept pointing at http://&lt;ip&gt; after the move to a
/// domain. Over HTTPS the browser then blocks all of them as mixed content and the site
/// loses every uploaded image at once.
///
/// The code now stores a relative path, which follows the site wherever it goes. This
/// migration fixes the rows that were written before that.
///
/// Deliberately conservative: it only touches values that contain this application's own
/// media path. A photo referenced by an external URL — an Unsplash image in the demo data,
/// or anything an admin pasted from elsewhere — is left exactly as it is.
/// </summary>
public partial class RelativeMediaUrls : Migration
{
    // STUFF(): replaces the leading scheme+host with nothing, leaving "/api/media/images/…".
    // Matching on the path means a row already stored relative (LIKE '/api/media/images/%')
    // has no '://' and is skipped by the second predicate, so running this twice is safe.
    private const string Marker = "/api/media/images/";

    private static string Rewrite(string table, string column) => $@"
UPDATE realestate.[{table}]
SET [{column}] = SUBSTRING([{column}], CHARINDEX('{Marker}', [{column}]), LEN([{column}]))
WHERE [{column}] LIKE '%{Marker}%'
  AND [{column}] LIKE '%://%';";

    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(Rewrite("PropertyMedia", "Url"));
        migrationBuilder.Sql(Rewrite("Agents", "PhotoUrl"));
        migrationBuilder.Sql(Rewrite("Areas", "PhotoUrl"));
        migrationBuilder.Sql(Rewrite("Developments", "CoverImageUrl"));
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Not reversible, and deliberately so. Going back would mean re-attaching a host
        // name to every one of these rows, and the only host available here is whatever
        // this server is called today — which is precisely the value that was wrong.
        // A relative URL works under both the old and the new address, so there is nothing
        // to undo.
    }
}
