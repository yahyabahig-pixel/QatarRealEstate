namespace RealEstate.Api.Requests;

// PUT body — { "isFeatured": true } promotes ("Exclusive" in the UI), false demotes.
public sealed record SetPropertyFeaturedRequest(bool IsFeatured);
