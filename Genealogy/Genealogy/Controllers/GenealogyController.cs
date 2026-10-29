using Genealogy.Models;
using Genealogy.Services;
using Microsoft.AspNetCore.Mvc;

namespace Genealogy.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GenealogyController : ControllerBase
{
    private readonly IGenealogyService _service;

    public GenealogyController(IGenealogyService service)
    {
        _service = service;
    }

    [HttpGet("roots")]
    public Task<List<GenealogyNodeDto>> GetRoots()
    {
        return _service.GetRootsAsync();
    }

    [HttpGet("{recordId:int}/children")]
    public Task<List<GenealogyNodeDto>> GetChildren(int recordId)
    {
        return _service.GetChildNodesAsync(recordId);
    }

    [HttpPatch("{recordId:int}")]
    public async Task<ActionResult<GenealogyActionResult>> Update(
        int recordId,
        [FromBody] GenealogyUpdateRequest request)
    {
        var record = await _service.GetByIdAsync(recordId);
        if (record is null)
        {
            return NotFound(new GenealogyActionResult
            {
                Success = false,
                Message = $"Genealogy record {recordId} was not found.",
            });
        }

        record.Name = request.Name.Trim();
        record.BirthYear = request.BirthYear;
        record.GenerationTitle = request.GenerationTitle.Trim();

        var updated = await _service.UpdateAsync(record);
        if (!updated)
        {
            return NotFound(new GenealogyActionResult
            {
                Success = false,
                Message = $"Genealogy record {recordId} was not found.",
            });
        }

        return Ok(new GenealogyActionResult
        {
            Success = true,
            Message = "Genealogy record updated successfully.",
        });
    }

    [HttpDelete("{recordId:int}")]
    public async Task<ActionResult<GenealogyActionResult>> Delete(int recordId)
    {
        var deleted = await _service.DeleteAsync(recordId);
        if (!deleted)
        {
            return NotFound(new GenealogyActionResult
            {
                Success = false,
                Message = $"Genealogy record {recordId} was not found.",
            });
        }

        return Ok(new GenealogyActionResult
        {
            Success = true,
            Message = "Genealogy record deleted and its children were relinked.",
        });
    }
}
