using Genealogy.Models;
using Microsoft.EntityFrameworkCore;

namespace Genealogy.Data;

public class GenealogyDatabaseInitializer
{
    private readonly GenealogyContext _context;
    private readonly ILogger<GenealogyDatabaseInitializer> _logger;

    public GenealogyDatabaseInitializer(
        GenealogyContext context,
        ILogger<GenealogyDatabaseInitializer> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        await _context.Database.EnsureCreatedAsync();

        if (!await _context.Genealogy.AnyAsync())
        {
            var sampleRecords = CreateSampleRecords();
            _context.Genealogy.AddRange(sampleRecords);
            await _context.SaveChangesAsync();
            _logger.LogInformation(
                "Created the sample genealogy with {RecordCount} records.",
                sampleRecords.Count);
        }

        if (!await _context.GenealogyBaseline.AnyAsync())
        {
            var baseline = await _context.Genealogy
                .AsNoTracking()
                .Select(record => new GenealogyBaselineRecord
                {
                    RecordID = record.RecordID,
                    ParentID = record.ParentID,
                    Name = record.Name,
                    BirthYear = record.BirthYear,
                    GenerationTitle = record.GenerationTitle,
                    IsDeleted = record.IsDeleted,
                })
                .ToListAsync();
            _context.GenealogyBaseline.AddRange(baseline);
            await _context.SaveChangesAsync();
            _logger.LogInformation(
                "Created the genealogy reset baseline with {RecordCount} records.",
                baseline.Count);
        }
    }

    private static List<GenealogyRecord> CreateSampleRecords()
    {
        return
        [
            new()
            {
                RecordID = 1, ParentID = "0", Name = "Eleanor Morgan", BirthYear = 1850,
                GenerationTitle = "First generation",
            },
            new()
            {
                RecordID = 2, ParentID = "1", Name = "Arthur Morgan", BirthYear = 1878,
                GenerationTitle = "Second generation",
            },
            new()
            {
                RecordID = 3, ParentID = "2", Name = "Beatrice Morgan", BirthYear = 1905,
                GenerationTitle = "Third generation",
            },
            new()
            {
                RecordID = 4, ParentID = "3", Name = "Clara Morgan", BirthYear = 1932,
                GenerationTitle = "Fourth generation",
            },
            new()
            {
                RecordID = 5, ParentID = "4", Name = "Daniel Morgan", BirthYear = 1958,
                GenerationTitle = "Fifth generation",
            },
            new()
            {
                RecordID = 6, ParentID = "5", Name = "Evelyn Morgan", BirthYear = 1984,
                GenerationTitle = "Sixth generation",
            },
            new()
            {
                RecordID = 7, ParentID = "3", Name = "Frances Morgan", BirthYear = 1935,
                GenerationTitle = "Fourth generation",
            },
            new()
            {
                RecordID = 8, ParentID = "7", Name = "George Morgan", BirthYear = 1962,
                GenerationTitle = "Fifth generation",
            },
            new()
            {
                RecordID = 9, ParentID = "8", Name = "Hazel Morgan", BirthYear = 1988,
                GenerationTitle = "Sixth generation",
            },
            new()
            {
                RecordID = 10, ParentID = "2", Name = "Isaac Morgan", BirthYear = 1908,
                GenerationTitle = "Third generation",
            },
            new()
            {
                RecordID = 11, ParentID = "10", Name = "Julia Morgan", BirthYear = 1937,
                GenerationTitle = "Fourth generation",
            },
            new()
            {
                RecordID = 12, ParentID = "11", Name = "Kenneth Morgan", BirthYear = 1963,
                GenerationTitle = "Fifth generation",
            },
            new()
            {
                RecordID = 13, ParentID = "12", Name = "Lucille Morgan", BirthYear = 1990,
                GenerationTitle = "Sixth generation",
            },
            new()
            {
                RecordID = 14, ParentID = "1", Name = "Martin Morgan", BirthYear = 1881,
                GenerationTitle = "Second generation",
            },
            new()
            {
                RecordID = 15, ParentID = "14", Name = "Nora Morgan", BirthYear = 1910,
                GenerationTitle = "Third generation",
            },
            new()
            {
                RecordID = 16, ParentID = "15", Name = "Oliver Morgan", BirthYear = 1939,
                GenerationTitle = "Fourth generation",
            },
            new()
            {
                RecordID = 17, ParentID = "16", Name = "Penelope Morgan", BirthYear = 1968,
                GenerationTitle = "Fifth generation",
            },
            new()
            {
                RecordID = 18, ParentID = "17", Name = "Quincy Morgan", BirthYear = 1995,
                GenerationTitle = "Sixth generation",
            },
        ];
    }
}
