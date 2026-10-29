using Genealogy.Models;

namespace Genealogy.Services;

public interface IGenealogyService
{
    Task<List<GenealogyNodeDto>> GetRootsAsync();
    Task<List<GenealogyNodeDto>> GetChildNodesAsync(int parentId);
    Task<GenealogyApplyResult> ApplyChangesAsync(GenealogyChangeSetRequest request);
    Task<bool> ResetAsync();
}
