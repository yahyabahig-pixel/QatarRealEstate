using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Jobs.Admin.Command.CreateJob;

// Every advert opens active — an admin who wants a draft creates it and immediately
// closes it via PUT {id}/active, rather than us inventing a second lifecycle flag.
public sealed record CreateJobCommand(
    string Title,
    string Department,
    string EmploymentType,
    string Location,
    string Description) : ICommand<Guid>;
