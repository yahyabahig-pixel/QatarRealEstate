namespace BuildingBlocks.Domain.Common;
// <summary>
//     Base class for domain events.
// should use INotification from MediatR to allow for domain events to be published and handled asynchronously.
// </summary>

public abstract class DomainEvent; // : INotification;