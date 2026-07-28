using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Jobs.User.Queries.GetJobDepartments;

// Feeds the Careers page filter chips. Today the frontend hard-codes
// ['All Departments', 'Marketing', 'Operations', 'Sales', 'Technology'] — which silently rots the
// moment HR opens a role in Finance. This returns the departments that actually have open roles.
public sealed record GetJobDepartmentsQuery : IQuery<IReadOnlyList<string>>;
