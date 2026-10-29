using System.ComponentModel.DataAnnotations;

namespace Genealogy.Models;

public class GenealogyChangeSetRequest
{
    [Required]
    public List<GenealogyChange> Nodes { get; set; } = [];
}

public class GenealogyChange
{
    public int RecordID { get; set; }

    [Required]
    [StringLength(255)]
    public string ParentID { get; set; } = string.Empty;

    [Required]
    [StringLength(255)]
    public string Name { get; set; } = string.Empty;

    public int BirthYear { get; set; }

    [StringLength(255)]
    public string GenerationTitle { get; set; } = string.Empty;

    public bool IsNew { get; set; }
    public bool IsDeleted { get; set; }
}
