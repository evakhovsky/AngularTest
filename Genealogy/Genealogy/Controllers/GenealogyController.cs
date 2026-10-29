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
}
