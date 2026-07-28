using Microsoft.EntityFrameworkCore;
using RealEstate.Application.Abstractions.Common;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Application.Leads;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Queries;

public sealed class LeadQueries : ILeadQueries
{
    private readonly RealEstateDbContext _db;
    public LeadQueries(RealEstateDbContext db) => _db = db;

    public async Task<PagedResult<LeadAdminListItemDto>> ListForAdminAsync(
        LeadAdminFilter filter, CancellationToken ct = default)
    {
        IQueryable<Lead> query = _db.Leads.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Text))
        {
            var pattern = $"%{filter.Text}%";
            query = query.Where(l =>
                EF.Functions.Like(l.FullName, pattern) ||
                EF.Functions.Like(l.Email, pattern) ||
                EF.Functions.Like(l.Phone, pattern));
        }

        if (filter.Type.HasValue) query = query.Where(l => l.Type == filter.Type.Value);
        if (filter.Status.HasValue) query = query.Where(l => l.Status == filter.Status.Value);

        var totalCount = await query.CountAsync(ct);
        if (totalCount == 0)
            return PagedResult<LeadAdminListItemDto>.Empty(filter.Page, filter.PageSize);

        var items = await query
            .OrderByDescending(l => l.CreatedAtUtc)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(l => new LeadAdminListItemDto(
                l.Id, l.FullName, l.Phone, l.Email, l.Type, l.Status, l.Source, l.Message,
                l.PropertyId,
                l.PropertyId != null
                    ? _db.Properties.Where(p => p.Id == l.PropertyId).Select(p => p.Title).FirstOrDefault()
                    : null,
                l.PropertyTypeName,
                l.ListingKind,
                l.Location != null ? l.Location.CityName : null,
                l.Location != null ? l.Location.StreetName : null,
                l.CreatedAtUtc.DateTime))
            .ToListAsync(ct);

        return new PagedResult<LeadAdminListItemDto>(items, filter.Page, filter.PageSize, totalCount);
    }

    public Task<LeadDetailsDto?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Leads.AsNoTracking()
            .Where(l => l.Id == id)
            .Select(l => new LeadDetailsDto(
                l.Id, l.FullName, l.Phone, l.Email, l.Type, l.Status, l.Source, l.Message,
                l.AgentId != null
                    ? _db.Agents.Where(a => a.Id == l.AgentId).Select(a => a.Name).FirstOrDefault()
                    : null,
                l.PropertyId != null
                    ? _db.Properties.Where(p => p.Id == l.PropertyId)
                        .Select(p => new LeadPropertyDto(
                            p.Id, p.Title, p.Location.CityName, p.ListingKind,
                            p.SaleTerms != null ? (decimal?)p.SaleTerms.Price.Amount
                                : p.RentTerms != null ? (decimal?)p.RentTerms.Price.Amount : null,
                            p.SaleTerms != null ? p.SaleTerms.Price.Currency
                                : p.RentTerms != null ? p.RentTerms.Price.Currency : null,
                            p.Media.Where(m => m.IsPrimary).Select(m => m.Url).FirstOrDefault(),
                            _db.PropertyTypes.Where(t => t.Id == p.PropertyTypeId).Select(t => t.Name).FirstOrDefault()))
                        .FirstOrDefault()
                    : null,
                l.PropertyTypeName,
                l.ListingKind,
                l.Location != null
                    ? new LeadLocationDto(
                        l.Location.CountryName, l.Location.CityName, l.Location.StreetName,
                        l.Location.State, l.Location.XCoordinate, l.Location.YCoordinate,
                        l.Location.Description)
                    : null,
                l.CreatedAtUtc.DateTime))
            .FirstOrDefaultAsync(ct);
}
