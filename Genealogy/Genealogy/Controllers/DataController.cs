using Microsoft.AspNetCore.Mvc;

namespace Genealogy.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DataController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get() => Ok(new { message = "hello from .NET" });
    }
}
