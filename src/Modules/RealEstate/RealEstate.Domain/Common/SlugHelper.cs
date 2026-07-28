using System.Text;

namespace RealEstate.Domain.Common;

// ---------------------------------------------------------------------------------------------
//  ONE slug algorithm for every public-URL entity (Agent, Development, and later Area/Article).
//  Lowercase; letters and digits kept; every other run of characters collapses to a single
//  '-'; no leading/trailing '-'. Deterministic, so the seeder and the API produce identical
//  slugs for identical input.
// ---------------------------------------------------------------------------------------------
public static class SlugHelper
{
    public static string Normalize(string input)
    {
        var sb = new StringBuilder(input.Length);
        var lastWasDash = true;                       // suppress a leading dash

        foreach (var ch in input.Trim().ToLowerInvariant())
        {
            if (char.IsAsciiLetterOrDigit(ch))
            {
                sb.Append(ch);
                lastWasDash = false;
            }
            else if (!lastWasDash)
            {
                sb.Append('-');
                lastWasDash = true;
            }
        }

        if (sb.Length > 0 && sb[^1] == '-') sb.Length--;
        return sb.ToString();
    }
}
