using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Properties.Admin.Queries.GetDashboardStatistics;

// Year = null → current UTC year. Always returns all 12 months, zero-filled.
public sealed record GetDashboardStatisticsQuery(int? Year = null) : IQuery<DashboardStatisticsDto>;
