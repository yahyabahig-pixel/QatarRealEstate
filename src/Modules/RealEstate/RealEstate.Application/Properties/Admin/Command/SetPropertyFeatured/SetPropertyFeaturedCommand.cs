using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Properties.Admin.Command.SetPropertyFeatured;

// "Exclusive" in the UI = IsFeatured in the domain — one concept, not two. Featuring is an
// editorial promotion (home-page section, top of Buy/Rent via the Relevance sort), separate
// from Create/Update on purpose: the domain only allows a PUBLISHED listing to be featured,
// so this follows the same lifecycle-endpoint pattern as publication.
public sealed record SetPropertyFeaturedCommand(Guid Id, bool IsFeatured) : ICommand<Updated>;
