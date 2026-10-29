using System.Data;
using System.Globalization;
using Genealogy.Data;
using Genealogy.Models;
using Microsoft.EntityFrameworkCore;

namespace Genealogy.Services;

public class GenealogyService : IGenealogyService
{
    private const string RootParentID = "0";
    private readonly GenealogyContext _context;
    private readonly ILogger<GenealogyService> _logger;

    public GenealogyService(
        GenealogyContext context,
        ILogger<GenealogyService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<GenealogyNodeDto>> GetRootsAsync()
    {
        var roots = await GetNodesByParentAsync(RootParentID);
        _logger.LogInformation("Loaded {RecordCount} genealogy root records.", roots.Count);
        return roots;
    }

    public async Task<List<GenealogyNodeDto>> GetChildNodesAsync(int parentId)
    {
        var children = await GetNodesByParentAsync(
            parentId.ToString(CultureInfo.InvariantCulture));
        _logger.LogInformation(
            "Loaded {RecordCount} children for genealogy record {ParentRecordId}.",
            children.Count,
            parentId);
        return children;
    }

    public async Task<GenealogyApplyResult> ApplyChangesAsync(GenealogyChangeSetRequest request)
    {
        var changes = request.Nodes;
        if (changes.Select(change => change.RecordID).Distinct().Count() != changes.Count)
        {
            return Failure("The change set contains duplicate record IDs.");
        }

        if (changes.Any(change =>
                (change.IsNew && (change.RecordID >= 0 || change.IsDeleted)) ||
                (!change.IsNew && change.RecordID <= 0)))
        {
            return Failure("The change set contains an invalid record ID or operation.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(
            IsolationLevel.Serializable);
        var records = await _context.Genealogy.ToListAsync();
        var recordsById = records.ToDictionary(record => record.RecordID);
        foreach (var change in changes.Where(change => !change.IsNew))
        {
            if (!recordsById.ContainsKey(change.RecordID))
            {
                return Failure($"Genealogy record {change.RecordID} was not found.");
            }
        }

        var temporaryIDs = new Dictionary<int, int>();
        var nextRecordID = records.Select(record => record.RecordID).DefaultIfEmpty(0).Max();
        foreach (var change in changes.Where(change => change.IsNew))
        {
            if (nextRecordID == int.MaxValue)
            {
                return Failure("No more record IDs are available.");
            }

            temporaryIDs.Add(change.RecordID, ++nextRecordID);
        }

        string? ResolveParentID(string parentID)
        {
            if (!int.TryParse(parentID, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id))
            {
                return null;
            }

            if (id == 0)
            {
                return RootParentID;
            }

            if (id < 0)
            {
                return temporaryIDs.TryGetValue(id, out var mappedID)
                    ? mappedID.ToString(CultureInfo.InvariantCulture)
                    : null;
            }

            return recordsById.ContainsKey(id)
                ? id.ToString(CultureInfo.InvariantCulture)
                : null;
        }

        foreach (var change in changes.Where(change => !change.IsNew && !change.IsDeleted))
        {
            var parentID = ResolveParentID(change.ParentID);
            if (parentID is null)
            {
                return Failure($"Parent record {change.ParentID} was not found.");
            }

            var record = recordsById[change.RecordID];
            record.ParentID = parentID;
            record.Name = change.Name.Trim();
            record.BirthYear = change.BirthYear;
            record.GenerationTitle = change.GenerationTitle.Trim();
        }

        var createdRecords = new List<GenealogyCreatedRecord>();
        foreach (var change in changes.Where(change => change.IsNew))
        {
            var parentID = ResolveParentID(change.ParentID);
            if (parentID is null)
            {
                return Failure($"Parent record {change.ParentID} was not found.");
            }

            var recordID = temporaryIDs[change.RecordID];
            var record = new GenealogyRecord
            {
                RecordID = recordID,
                ParentID = parentID,
                Name = change.Name.Trim(),
                BirthYear = change.BirthYear,
                GenerationTitle = change.GenerationTitle?.Trim() ?? string.Empty,
                IsDeleted = false,
            };
            records.Add(record);
            recordsById.Add(recordID, record);
            createdRecords.Add(new GenealogyCreatedRecord
            {
                ClientRecordID = change.RecordID,
                RecordID = recordID,
            });
        }

        var deletedIDs = changes
            .Where(change => !change.IsNew && change.IsDeleted)
            .Select(change => change.RecordID)
            .ToHashSet();
        foreach (var deletedID in deletedIDs)
        {
            recordsById[deletedID].IsDeleted = true;
        }

        var deletedRecordIDs = records
            .Where(record => record.IsDeleted)
            .Select(record => record.RecordID)
            .ToHashSet();
        foreach (var record in records.Where(record => !record.IsDeleted))
        {
            var visited = new HashSet<int>();
            while (int.TryParse(record.ParentID, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parentID) &&
                   deletedRecordIDs.Contains(parentID))
            {
                if (!visited.Add(parentID) || !recordsById.TryGetValue(parentID, out var deletedParent))
                {
                    return Failure($"The parent relationship for record {record.RecordID} is invalid.");
                }

                record.ParentID = deletedParent.ParentID;
            }
        }

        var invalidRelationship = ValidateActiveRelationships(records, recordsById);
        if (invalidRelationship is not null)
        {
            return Failure(invalidRelationship);
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        _logger.LogInformation(
            "Applied genealogy change set with {ChangedRecordCount} changes, " +
            "{CreatedRecordCount} created records, and {DeletedRecordCount} deleted records.",
            changes.Count,
            createdRecords.Count,
            deletedIDs.Count);

        return new GenealogyApplyResult
        {
            Success = true,
            Message = "Staged changes applied successfully.",
            CreatedRecords = createdRecords,
        };
    }

    public async Task<bool> ResetAsync()
    {
        try
        {
            await using var transaction = await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);
            var baseline = await _context.GenealogyBaseline
                .AsNoTracking()
                .OrderBy(record => record.RecordID)
                .ToListAsync();
            if (baseline.Count == 0)
            {
                _logger.LogWarning("Genealogy reset was rejected because no baseline records exist.");
                return false;
            }

            await _context.Genealogy.ExecuteDeleteAsync();
            _context.Genealogy.AddRange(baseline.Select(record => new GenealogyRecord
            {
                RecordID = record.RecordID,
                ParentID = record.ParentID,
                Name = record.Name,
                BirthYear = record.BirthYear,
                GenerationTitle = record.GenerationTitle,
                IsDeleted = record.IsDeleted,
            }));
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            _logger.LogInformation(
                "Restored {RecordCount} genealogy records from the baseline.",
                baseline.Count);
            return true;
        }
        catch(Exception ex)
        {
            _logger.LogError(ex, "ResetAsync error");
        }

        return false;
    }

    private Task<List<GenealogyNodeDto>> GetNodesByParentAsync(string parentID)
    {
        return _context.Genealogy
            .AsNoTracking()
            .Where(record => !record.IsDeleted && record.ParentID == parentID)
            .OrderBy(record => record.BirthYear)
            .Select(record => new GenealogyNodeDto
            {
                RecordID = record.RecordID,
                ParentID = record.ParentID,
                Name = record.Name,
                BirthYear = record.BirthYear,
                GenerationTitle = record.GenerationTitle,
                HasChildren = _context.Genealogy.Any(child =>
                    !child.IsDeleted && child.ParentID == record.RecordID.ToString()),
                IsDeleted = record.IsDeleted,
            })
            .ToListAsync();
    }

    private static string? ValidateActiveRelationships(
        List<GenealogyRecord> records,
        Dictionary<int, GenealogyRecord> recordsById)
    {
        foreach (var record in records.Where(record => !record.IsDeleted))
        {
            var visited = new HashSet<int> { record.RecordID };
            var current = record;
            while (current.ParentID != RootParentID)
            {
                if (!int.TryParse(
                        current.ParentID,
                        NumberStyles.Integer,
                        CultureInfo.InvariantCulture,
                        out var parentID) ||
                    !recordsById.TryGetValue(parentID, out var parent) ||
                    parent.IsDeleted)
                {
                    return $"The parent relationship for record {record.RecordID} is invalid.";
                }

                if (!visited.Add(parentID))
                {
                    return $"The change set would create a cycle at record {record.RecordID}.";
                }

                current = parent;
            }
        }

        return null;
    }

    private GenealogyApplyResult Failure(string message)
    {
        _logger.LogWarning("Rejected genealogy change set: {Reason}", message);
        return new GenealogyApplyResult
        {
            Success = false,
            Message = message,
        };
    }
}
