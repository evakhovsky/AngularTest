namespace Genealogy.Models;

public class GenealogyApplyResult : GenealogyActionResult
{
    public List<GenealogyCreatedRecord> CreatedRecords { get; set; } = [];
}

public class GenealogyCreatedRecord
{
    public int ClientRecordID { get; set; }
    public int RecordID { get; set; }
}
