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

    [HttpPost("changes")]
    public async Task<ActionResult<GenealogyApplyResult>> ApplyChanges(
        [FromBody] GenealogyChangeSetRequest request)
    {
        var result = await _service.ApplyChangesAsync(request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("reset")]
    public async Task<ActionResult<GenealogyActionResult>> Reset()
    {
        var reset = await _service.ResetAsync();
        if (!reset)
        {
            return Conflict(new GenealogyActionResult
            {
                Success = false,
                Message = "The original genealogy snapshot is not available.",
            });
        }

        return Ok(new GenealogyActionResult
        {
            Success = true,
            Message = "The genealogy tree was restored to its original snapshot.",
        });
    }
}
