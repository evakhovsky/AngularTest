using Genealogy.Models;

namespace Genealogy.Services;

public interface IGenealogyService
{
    Task<List<GenealogyRecord>> GetAllAsync();
    Task<GenealogyRecord?> GetByIdAsync(int recordId);
    Task<List<GenealogyRecord>> GetChildrenAsync(int parentId);
    Task<List<GenealogyNodeDto>> GetRootsAsync();
    Task<List<GenealogyNodeDto>> GetChildNodesAsync(int parentId);
    Task<GenealogyRecord> AddAsync(GenealogyRecord record);
    Task<bool> UpdateAsync(GenealogyRecord record);
    Task<bool> DeleteAsync(int recordId);
}
