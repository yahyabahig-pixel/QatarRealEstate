namespace BuildingBlocks.Api;

// ---------------------------------------------------------------------------------------
//  The names of the rate-limiting policies, in one place.
//
//  They used to be a const in Program.cs and a matching string literal in each controller,
//  which is a spelling agreement held together by nobody. ASP.NET Core does not check the
//  name at startup: a controller decorated with a policy that was never registered throws
//  only when a request arrives, which for the view counter would mean a 500 on every
//  property page open and nothing wrong anywhere a build or a test would look.
//
//  Here, a wrong name is a compile error. Both the registration in Program.cs and the
//  [EnableRateLimiting] attributes refer to these.
// ---------------------------------------------------------------------------------------

public static class RateLimitPolicies
{
    /// <summary>Sign-in. Loose enough for a mistyped password, tight enough to stop a script.</summary>
    public const string Login = "login";

    /// <summary>The public contact forms — each request writes a lead.</summary>
    public const string PublicWrite = "public-write";

    /// <summary>
    /// The property view counter. Separate from PublicWrite on purpose: opening a listing is
    /// a read to the visitor and a write to us, and sharing one allowance meant a buyer
    /// working through a shortlist spent the contact form's budget before reaching the form.
    /// </summary>
    public const string ViewCounter = "view-counter";
}
