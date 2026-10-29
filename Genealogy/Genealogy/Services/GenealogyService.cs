using Genealogy.Data;
using Genealogy.Models;
using Microsoft.EntityFrameworkCore;

namespace Genealogy.Services;

public class GenealogyService : IGenealogyService
{
    private readonly GenealogyContext _context;

    public GenealogyService(GenealogyContext context)
    {
        _context = context;
    }

    public Task<List<GenealogyRecord>> GetAllAsync()
    {
        return _context.Genealogy
            .AsNoTracking()
            .OrderBy(r => r.RecordID)
            .ToListAsync();
    }

    public Task<GenealogyRecord?> GetByIdAsync(int recordId)
    {
        return _context.Genealogy
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.RecordID == recordId);
    }

    public Task<List<GenealogyRecord>> GetChildrenAsync(int parentId)
    {
        return _context.Genealogy
            .AsNoTracking()
            .Where(r => r.ParentID == parentId.ToString())
            .OrderBy(r => r.BirthYear)
            .ToListAsync();
    }

    public Task<List<GenealogyNodeDto>> GetRootsAsync()
    {
        return GetNodesByParentAsync("0");
    }

    public Task<List<GenealogyNodeDto>> GetChildNodesAsync(int parentId)
    {
        return GetNodesByParentAsync(parentId.ToString());
    }

    private Task<List<GenealogyNodeDto>> GetNodesByParentAsync(string parentId)
    {
        return _context.Genealogy
            .AsNoTracking()
            .Where(r => r.ParentID == parentId)
            .OrderBy(r => r.BirthYear)
            .Select(r => new GenealogyNodeDto
            {
                RecordID = r.RecordID,
                ParentID = r.ParentID,
                Name = r.Name,
                BirthYear = r.BirthYear,
                GenerationTitle = r.GenerationTitle,
                HasChildren = _context.Genealogy.Any(c => c.ParentID == r.RecordID.ToString()),
            })
            .ToListAsync();
    }

    public async Task<GenealogyRecord> AddAsync(GenealogyRecord record)
    {
        if (record.RecordID <= 0)
        {
            var maxId = await _context.Genealogy.MaxAsync(r => (int?)r.RecordID) ?? 0;
            record.RecordID = maxId + 1;
        }

        _context.Genealogy.Add(record);
        await _context.SaveChangesAsync();
        return record;
    }

    public async Task<bool> UpdateAsync(GenealogyRecord record)
    {
        var existing = await _context.Genealogy.FindAsync(record.RecordID);
        if (existing is null)
        {
            return false;
        }

        existing.ParentID = record.ParentID;
        existing.Name = record.Name;
        existing.BirthYear = record.BirthYear;
        existing.GenerationTitle = record.GenerationTitle;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int recordId)
    {
        var existing = await _context.Genealogy.FindAsync(recordId);
        if (existing is null)
        {
            return false;
        }

        _context.Genealogy.Remove(existing);
        await _context.SaveChangesAsync();
        return true;
    }
}
