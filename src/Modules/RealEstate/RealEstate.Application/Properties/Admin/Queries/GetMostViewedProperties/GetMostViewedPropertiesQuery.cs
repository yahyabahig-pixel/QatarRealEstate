using RealEstate.Application.Abstractions.Messaging;

namespace RealEstate.Application.Properties.Admin.Queries.GetMostViewedProperties;

// EXTENSION POINT (time ranges): views are stored as ONE aggregate counter per property
// (Properties.ViewsCount, incremented by PropertyViewRecorder) — there is no per-view
// row with a timestamp, so "Today / Last 7 days" filters cannot be computed from the
// current data. If per-view records are ever introduced, add `DateTimeOffset? From`
// here and translate it in IPropertyQueries.GetMostViewedAsync; the DTO and endpoint
// shapes already accommodate it.
public sealed record GetMostViewedPropertiesQuery(int Take = 5) : IQuery<MostViewedPropertiesDto>;
