using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MediTech.Backend.Models;
using Microsoft.AspNetCore.Authorization;

namespace MediTech.Backend.Controllers;

[Authorize]
public class ReportesController : Controller
{
    private readonly MediTechContext _context;

    public ReportesController(MediTechContext context)
    {
        _context = context;
    }

    public async Task<IActionResult> Index(DateTime? desde, DateTime? hasta)
    {
        var today = DateTime.Today;
        
        // Calcular inicio de semana (Lunes)
        int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
        var startOfWeek = today.AddDays(-1 * diff).Date;
        var startOfMonth = new DateTime(today.Year, today.Month, 1);
        var startOfYear = new DateTime(today.Year, 1, 1);

        // Obtener configuración de moneda base
        var configMoneda = await _context.ConfiguracionesMoneda
            .Include(c => c.MonedaBase)
            .FirstOrDefaultAsync();
        
        ViewBag.SimboloBase = configMoneda?.MonedaBase?.Simbolo ?? "$";
        ViewBag.NombreMoneda = configMoneda?.MonedaBase?.Nombre ?? "Dólares";

        // 1. Totales por periodo (Actuales)
        ViewBag.GananciaHoy = await _context.Pagos
            .Where(p => p.FechaPago.Date == today)
            .SumAsync(p => p.MontoBase ?? 0);

        ViewBag.GananciaSemana = await _context.Pagos
            .Where(p => p.FechaPago.Date >= startOfWeek)
            .SumAsync(p => p.MontoBase ?? 0);

        ViewBag.GananciaMes = await _context.Pagos
            .Where(p => p.FechaPago.Date >= startOfMonth)
            .SumAsync(p => p.MontoBase ?? 0);

        ViewBag.GananciaAño = await _context.Pagos
            .Where(p => p.FechaPago.Date >= startOfYear)
            .SumAsync(p => p.MontoBase ?? 0);

        // 2. Lógica de Filtrado Personalizado
        ViewBag.FiltroActivo = false;
        ViewBag.DesdeStr = desde?.ToString("yyyy-MM-dd");
        ViewBag.HastaStr = hasta?.ToString("yyyy-MM-dd");
        ViewBag.StartDate = desde;
        ViewBag.EndDate = hasta;

        var rangeStart = startOfMonth;
        var rangeEnd = DateTime.Now;

        if (desde.HasValue || hasta.HasValue)
        {
            ViewBag.FiltroActivo = true;
            rangeStart = desde ?? new DateTime(2000, 1, 1);
            rangeEnd = hasta?.AddDays(1).AddSeconds(-1) ?? DateTime.Now;

            ViewBag.GananciaFiltrada = await _context.Pagos
                .Where(p => p.FechaPago >= rangeStart && p.FechaPago <= rangeEnd)
                .SumAsync(p => p.MontoBase ?? 0);
        }

        // 3. Desglose por método de pago (Usa el rango filtrado o el mes actual)
        var pagosQuery = await _context.Pagos
            .Where(p => p.FechaPago >= rangeStart && p.FechaPago <= rangeEnd)
            .GroupBy(p => p.MetodoPago)
            .Select(g => new { 
                Metodo = g.Key ?? "OTRO", 
                Total = g.Sum(p => p.MontoBase ?? 0) 
            })
            .ToListAsync();
        
        // Asegurar que los 3 métodos principales existan para el Dashboard
        var metodosPrincipales = new List<string> { "EFECTIVO", "TARJETA", "TRANSFERENCIA" };
        var desgloseFinal = metodosPrincipales.Select(m => new {
            Metodo = m,
            Total = pagosQuery.FirstOrDefault(p => p.Metodo.ToUpper() == m)?.Total ?? 0
        }).ToList();

        // Agregar otros métodos si existen y no son los principales
        var otrosMetodos = pagosQuery.Where(p => !metodosPrincipales.Contains(p.Metodo.ToUpper()));
        foreach(var otro in otrosMetodos) {
            desgloseFinal.Add(new { Metodo = otro.Metodo, Total = otro.Total });
        }
        
        ViewBag.DesgloseMetodos = desgloseFinal;
        ViewBag.TotalPeriodo = desgloseFinal.Sum(d => d.Total);

        // 4. Datos para el gráfico de tendencia (Últimos 6 meses - Mantenido como contexto)
        var seisMesesAtras = new DateTime(today.Year, today.Month, 1).AddMonths(-5);
        var tendenciaMensual = await _context.Pagos
            .Where(p => p.FechaPago.Date >= seisMesesAtras)
            .GroupBy(p => new { p.FechaPago.Year, p.FechaPago.Month })
            .Select(g => new {
                Anio = g.Key.Year,
                Mes = g.Key.Month,
                Total = g.Sum(p => p.MontoBase ?? 0)
            })
            .OrderBy(x => x.Anio).ThenBy(x => x.Mes)
            .ToListAsync();

        ViewBag.TendenciaLabels = tendenciaMensual.Select(x => $"{GetMesNombre(x.Mes)} {x.Anio}").ToList();
        ViewBag.TendenciaValores = tendenciaMensual.Select(x => x.Total).ToList();

        return View();
    }

    private string GetMesNombre(int mes)
    {
        return mes switch
        {
            1 => "Ene", 2 => "Feb", 3 => "Mar", 4 => "Abr", 5 => "May", 6 => "Jun",
            7 => "Jul", 8 => "Ago", 9 => "Sep", 10 => "Oct", 11 => "Nov", 12 => "Dic",
            _ => ""
        };
    }
}
