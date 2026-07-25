using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
namespace RealEstate.Application.Properties.Admin.ArchiveProperty;

public sealed record ArchivePropertyCommand(Guid Id) : ICommand<Updated>;