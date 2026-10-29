using System.ComponentModel.DataAnnotations;

namespace Genealogy.Models;

public class GenealogyUpdateRequest
{
    [Required]
    [StringLength(255)]
    public string Name { get; set; } = string.Empty;

    public int BirthYear { get; set; }

    [Required]
    [StringLength(255)]
    public string GenerationTitle { get; set; } = string.Empty;
}
