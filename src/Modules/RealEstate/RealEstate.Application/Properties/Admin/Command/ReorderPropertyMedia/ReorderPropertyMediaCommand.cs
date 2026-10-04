using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Properties.Admin.Command.ReorderPropertyMedia;

/// <summary>
/// The gallery's order, as the admin arranged it: media ids, first to last. The first id is
/// the cover.
///
/// This endpoint exists because the admin form's arrows had no effect at all. Saving compared
/// the form's photos to the stored ones BY URL — so it could add new photos and remove deleted
/// ones, but a pure reordering looked like "nothing changed", and the cover stayed whatever it
/// was first uploaded as.
/// </summary>
public sealed record ReorderPropertyMediaCommand(
    Guid PropertyId,
    IReadOnlyList<Guid> MediaIds) : ICommand<Updated>;
