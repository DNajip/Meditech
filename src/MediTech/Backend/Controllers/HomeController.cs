using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MediTech.Backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace MediTech.Backend.Controllers;

[Authorize]
public class HomeController(ILogger<HomeController> logger, MediTechContext context) : Controller
{
    private readonly ILogger<HomeController> _logger = logger;
    private readonly MediTechContext _context = context;

    public async Task<IActionResult> Index()
    {
        var today = DateTime.Today;

        ViewBag.TotalPacientes = await _context.Pacientes.CountAsync(p => p.IdEstado == 1);
        ViewBag.PacientesHoy = await _context.Pacientes.CountAsync(p => p.FechaRegistro.HasValue && p.FechaRegistro.Value.Date == today);

        await PrepareDropdowns();

        return View();
    }

    private async Task PrepareDropdowns()
    {
        var tiposIdentificacion = await _context.TiposIdentificacion
            .Where(c => c.IdEstado == 1)
            .OrderBy(c => c.DescTipo)
            .Select(c => new { Value = c.IdTipoIdentificacion, Text = c.DescTipo })
            .ToListAsync();
        ViewBag.TiposIdentificacion = new Microsoft.AspNetCore.Mvc.Rendering.SelectList(tiposIdentificacion, "Value", "Text");

        var generos = await _context.Generos
            .Where(c => c.IdEstado == 1)
            .OrderBy(c => c.DescGenero)
            .Select(c => new { Value = c.IdGenero, Text = c.DescGenero })
            .ToListAsync();
        ViewBag.Generos = new Microsoft.AspNetCore.Mvc.Rendering.SelectList(generos, "Value", "Text");
    }

    public IActionResult Privacy()
    {
        return View();
    }

    [AllowAnonymous]
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}

