namespace RealEstate.Application.Properties.Admin.Queries.GetDashboardStatistics;

// One calendar month of REAL platform activity. Each metric uses the timestamp that
// actually describes it: NewProperties groups on Property.CreatedAtUtc; Published/Sold/
// Rented/Archived group on PropertyStatusHistory.CreatedAtUtc — the moment the status
// CHANGED, not the moment the property was created. Views have no per-event timestamps
// (Properties.ViewsCount is a single aggregate counter), so a monthly views series is
// deliberately absent rather than fabricated.
public sealed record MonthlyStatisticsDto(
    int Month,
    string MonthName,
    int NewProperties,
    int Published,
    int Sold,
    int Rented,
    int Archived,
    int NewLeads);

public sealed record DashboardStatisticsDto(
    int Year,
    IReadOnlyList<int> AvailableYears,
    IReadOnlyList<MonthlyStatisticsDto> Months);
