namespace Genealogy.Models;

public class GenealogyNodeDto
{
    public int RecordID { get; set; }
    public string ParentID { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int BirthYear { get; set; }
    public string GenerationTitle { get; set; } = string.Empty;
    public bool HasChildren { get; set; }
}
