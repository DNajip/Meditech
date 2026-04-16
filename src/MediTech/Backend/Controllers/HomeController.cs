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

        int daysToSunday = today.DayOfWeek == DayOfWeek.Sunday ? 0 : 7 - (int)today.DayOfWeek;
        var endOfWeek = today.AddDays(daysToSunday);

        // Obtener configuración de moneda base
        var configMoneda = await _context.ConfiguracionesMoneda
            .Include(c => c.MonedaBase)
            .FirstOrDefaultAsync();
        ViewBag.SimboloBase = configMoneda?.MonedaBase?.Simbolo ?? "$";

        ViewBag.TotalPacientes = await _context.Pacientes.CountAsync(p => p.IdEstado == 1);
        
        // Citas de la semana (hoy hasta domingo), excluyendo canceladas y no asistió
        ViewBag.CitasSemana = await _context.Citas
            .Where(c => c.IdEstadoCita != 4 && c.IdEstadoCita != 5
                     && c.Fecha.Date >= today && c.Fecha.Date <= endOfWeek)
            .CountAsync();

        // Ingresos estimados: materializar citas de hoy y sumar en memoria
        // (Include + SumAsync con navigation property no se traduce correctamente a SQL)
        var citasHoy = await _context.Citas
            .Include(c => c.Tratamiento)
            .Where(c => c.Fecha.Date == today
                     && c.IdEstadoCita != 4 && c.IdEstadoCita != 5
                     && c.IdTratamiento != null)
            .ToListAsync();

        ViewBag.IngresosEstimados = citasHoy
            .Where(c => c.Tratamiento != null)
            .Sum(c => c.Tratamiento!.Precio ?? 0m);

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

