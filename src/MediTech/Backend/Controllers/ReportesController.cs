using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MediTech.Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Caching.Memory;

namespace MediTech.Backend.Controllers;

[Authorize]
public class ReportesController : Controller
{
    private readonly MediTechContext _context;
    private readonly IMemoryCache _cache;
    private const string TasaCacheKey = "ActiveExchangeRate";

    public ReportesController(MediTechContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
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
        var desgloseFinal = metodosPrincipales.Select(m => new MetodoPagoDto
        {
            Metodo = m,
            Total = pagosQuery.FirstOrDefault(p => p.Metodo.ToUpper() == m)?.Total ?? 0
        }).ToList();

        // Agregar otros métodos si existen y no son los principales
        var otrosMetodos = pagosQuery.Where(p => !metodosPrincipales.Contains(p.Metodo.ToUpper()));
        foreach (var otro in otrosMetodos)
        {
            desgloseFinal.Add(new MetodoPagoDto { Metodo = otro.Metodo, Total = otro.Total });
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

        // 5. Cargar Consultas para la segunda sección del Acordeón
        var consultas = await _context.Consultas
            .Include(c => c.Cita!)
                .ThenInclude(ci => ci.Paciente!)
                    .ThenInclude(p => p.Persona!)
            .Include(c => c.Medico!)
                .ThenInclude(e => e.Persona!)
            .Include(c => c.Estado)
            .OrderByDescending(c => c.FechaConsulta)
            .Take(20) // Mostramos las últimas 20 por defecto en el dashboard
            .ToListAsync();
            
        ViewBag.HistorialConsultas = consultas;

        return View();
    }

    // Historial de Consultas (Gestión de Consultas)
    public async Task<IActionResult> HistorialConsultas(int page = 1)
    {
        int pageSize = 10;
        
        var totalConsultas = await _context.Consultas.CountAsync();
        var totalPages = (int)Math.Ceiling(totalConsultas / (double)pageSize);

        var consultas = await _context.Consultas
            .Include(c => c.Cita!)
                .ThenInclude(ci => ci.Paciente!)
                    .ThenInclude(p => p.Persona!)
            .Include(c => c.Medico!)
                .ThenInclude(e => e.Persona!)
            .Include(c => c.Estado)
            .OrderByDescending(c => c.FechaConsulta)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        ViewBag.CurrentPage = page;
        ViewBag.TotalPages = totalPages;
        ViewBag.TotalCount = totalConsultas;

        // Si es una petición AJAX (para el acordeón si decidimos cargarlo asíncronamente), 
        // podríamos retornar una vista parcial. Por ahora, manejamos la navegación normal.
        return View(consultas);
    }

    // Detalle de Expediente Clínico Histórico
    public async Task<IActionResult> DetalleExpediente(int? id)
    {
        if (id == null) return NotFound();

        var consulta = await _context.Consultas
            .Include(c => c.Cita!)
                .ThenInclude(ci => ci.Paciente!)
                    .ThenInclude(p => p.Persona!)
            .Include(c => c.Cita!)
                .ThenInclude(ci => ci.Tratamiento!)
            .Include(c => c.Medico!)
                .ThenInclude(e => e.Persona!)
            .Include(c => c.SignosVitales!)
            .Include(c => c.Diagnosticos)
            .Include(c => c.Estado)
            .FirstOrDefaultAsync(m => m.IdConsulta == id);

        if (consulta == null) return NotFound();

        return View(consulta);
    }

    // --- MIGRATED CONSULTATION MANAGEMENT ACTIONS ---
    
    // GET: Reportes/Recepcion/5 (Triage/Reception)
    public async Task<IActionResult> Recepcion(int? id)
    {
        if (id == null) return RedirectToAction("Index");

        var cita = await _context.Citas
            .Include(c => c.Paciente).ThenInclude(p => p!.Persona)
            .Include(c => c.Tratamiento)
            .FirstOrDefaultAsync(m => m.IdCita == id);

        if (cita == null) return RedirectToAction("Index");

        var consultaExistente = await _context.Consultas
            .Include(c => c.SignosVitales)
            .Include(c => c.Estado)
            .Include(c => c.Cita).ThenInclude(ci => ci!.Paciente).ThenInclude(p => p!.Persona)
            .FirstOrDefaultAsync(c => c.IdCita == id && c.Estado!.DescEstado == "EN PROCESO");

        if (consultaExistente != null)
        {
            if (consultaExistente.SignosVitales == null) consultaExistente.SignosVitales = new SignosVitales();
            return View(consultaExistente);
        }

        var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId)) return RedirectToAction("Index");

        var usuario = await _context.Usuarios.Include(u => u.Empleado).FirstOrDefaultAsync(u => u.IdUsuario == userId);
        if (usuario?.IdEmpleado == null)
        {
            TempData["Error"] = "El usuario no tiene un registro de médico asociado.";
            return RedirectToAction("Index");
        }

        var estadoEnProceso = await _context.Estados.FirstOrDefaultAsync(e => e.DescEstado == "EN PROCESO");
        var nuevaConsulta = new Consulta
        {
            IdCita = id.Value,
            IdMedico = usuario.IdEmpleado.Value,
            IdEstado = estadoEnProceso?.IdEstado ?? 1,
            FechaConsulta = DateTime.Now,
            SignosVitales = new SignosVitales(),
            Cita = cita
        };

        return View(nuevaConsulta);
    }

    // GET: Reportes/Atender/5 (id is IdCita)
    public async Task<IActionResult> Atender(int? id)
    {
        if (id == null) return RedirectToAction("Index", "Citas");

        var cita = await _context.Citas
            .Include(c => c.Paciente).ThenInclude(p => p!.Persona)
            .Include(c => c.Tratamiento)
            .FirstOrDefaultAsync(m => m.IdCita == id);

        if (cita == null) return NotFound();

        var consultaExistente = await _context.Consultas.FirstOrDefaultAsync(c => c.IdCita == id);
        if (consultaExistente != null)
        {
            return RedirectToAction("DetalleExpediente", new { id = consultaExistente.IdConsulta });
        }

        var username = User.Identity?.Name;
        var usuario = await _context.Usuarios
            .Include(u => u.Empleado)
            .FirstOrDefaultAsync(u => u.Username == username);

        if (usuario?.IdEmpleado == null)
        {
            TempData["Error"] = "No se pudo identificar al médico para esta consulta.";
            return RedirectToAction("Index", "Citas");
        }

        var nuevaConsulta = new Consulta
        {
            IdCita = cita.IdCita,
            IdMedico = usuario!.IdEmpleado!.Value,
            MotivoConsulta = cita.Observaciones,
            IdEstado = 1,
            Cita = cita
        };

        nuevaConsulta.SignosVitales = new SignosVitales();

        return View("Create", nuevaConsulta);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Create(Consulta consulta, SignosVitales signos)
    {
        if (ModelState.IsValid)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Add(consulta);
                await _context.SaveChangesAsync();

                signos.IdConsulta = consulta.IdConsulta;
                _context.Add(signos);

                var cita = await _context.Citas.FindAsync(consulta.IdCita);
                if (cita != null)
                {
                    cita.IdEstadoCita = 3; // FINALIZADA
                    _context.Update(cita);
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                TempData["Success"] = "Consulta registrada exitosamente.";
                return RedirectToAction("HistorialConsultas");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
            }
        }

        consulta.Cita = await _context.Citas.Include(c => c.Paciente!).ThenInclude(p => p.Persona!).FirstOrDefaultAsync(m => m.IdCita == consulta.IdCita);
        return View(consulta);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> CerrarConsulta([FromBody] CerrarConsultaDto data)
    {
        if (data == null || data.IdConsulta <= 0) return Json(new { success = false, message = "Datos inválidos." });
        data.Items ??= new List<ItemCierreDto>();

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var consulta = await _context.Consultas.Include(c => c.Cita).FirstOrDefaultAsync(c => c.IdConsulta == data.IdConsulta);
            if (consulta == null) return Json(new { success = false, message = "Consulta no encontrada." });

            var estadoFinalizada = await _context.Estados.FirstOrDefaultAsync(e => e.DescEstado == "FINALIZADA");
            var idEstadoFinalizada = estadoFinalizada?.IdEstado ?? 3;

            if (consulta.IdEstado == idEstadoFinalizada) return Json(new { success = false, message = "La consulta ya fue finalizada." });

            consulta.DiagnosticoPrincipal = data.DiagnosticoFinal;
            consulta.Observaciones = data.Observaciones;
            consulta.IdEstado = idEstadoFinalizada;
            _context.Update(consulta);

            if (consulta.Cita != null) { consulta.Cita.IdEstadoCita = 3; _context.Update(consulta.Cita); }

            var configMoneda = await _context.ConfiguracionesMoneda.FirstOrDefaultAsync();
            decimal total = data.Items.Sum(i => i.Cantidad * i.PrecioUnitario);

            var nuevaCuenta = new Cuenta
            {
                IdPaciente = consulta.Cita?.IdPaciente,
                IdConsulta = consulta.IdConsulta,
                TotalBruto = total,
                TotalFinal = total,
                IdMonedaBase = configMoneda?.IdMonedaBase,
                FechaCreacion = DateTime.Now
            };
            _context.Cuentas.Add(nuevaCuenta);
            await _context.SaveChangesAsync();

            foreach (var item in data.Items)
            {
                var consultaDetalle = new ConsultaDetalle { IdConsulta = consulta.IdConsulta, TipoItem = item.TipoItem?.ToUpper(), IdReferencia = item.IdReferencia, Descripcion = item.Descripcion, Cantidad = item.Cantidad, PrecioUnitario = item.PrecioUnitario, Subtotal = item.Cantidad * item.PrecioUnitario };
                _context.ConsultaDetalles.Add(consultaDetalle);

                var cuentaDetalle = new CuentaDetalle { IdCuenta = nuevaCuenta.IdCuenta, TipoItem = item.TipoItem?.ToUpper(), IdReferencia = item.IdReferencia, Descripcion = item.Descripcion, Cantidad = item.Cantidad, PrecioUnitario = item.PrecioUnitario, Subtotal = item.Cantidad * item.PrecioUnitario };
                _context.CuentaDetalles.Add(cuentaDetalle);

                if (item.TipoItem?.ToUpper() == "PRODUCTO")
                {
                    var producto = await _context.Productos.FindAsync(item.IdReferencia);
                    if (producto != null) { producto.Stock -= item.Cantidad; _context.Update(producto); }
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
            return Json(new { success = true, idConsulta = consulta.IdConsulta, cuentaId = nuevaCuenta.IdCuenta });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            return Json(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetCatTratamientos()
    {
        var trats = await _context.Tratamientos.Where(t => t.IdEstado == 1).Select(t => new { id = t.IdTratamiento, nombre = t.NombreTratamiento, precio = t.Precio ?? 0 }).ToListAsync();
        return Json(trats);
    }

    [HttpGet]
    public async Task<IActionResult> GetCatProductos()
    {
        var prods = await _context.Productos.Where(p => p.Activo && p.Stock > 0).Select(p => new { id = p.IdProducto, nombre = p.Nombre, precio = p.Precio ?? 0, stock = p.Stock }).ToListAsync();
        return Json(prods);
    }

    [HttpGet]
    public async Task<IActionResult> GetHistorialPaciente(int id)
    {
        try
        {
            var raw = await _context.Consultas.Include(c => c.Estado).Include(c => c.Medico!).ThenInclude(m => m.Persona).Include(c => c.SignosVitales).Include(c => c.ConsultaDetalles).Where(c => c.Cita!.IdPaciente == id && c.Estado!.DescEstado == "FINALIZADA").OrderByDescending(c => c.FechaConsulta).ToListAsync();
            var res = raw.Select(c => new { idConsulta = c.IdConsulta, fecha = c.FechaConsulta.ToString("dd/MM/yyyy"), hora = c.FechaConsulta.ToString("hh:mm tt"), medico = c.Medico?.Persona != null ? $"{c.Medico.Persona.PrimerNombre} {c.Medico.Persona.PrimerApellido}" : "Médico —", diagnostico = c.DiagnosticoPrincipal ?? "Sin diagnóstico", observaciones = c.Observaciones ?? "Cerrada", signos = c.SignosVitales != null ? new { pa = c.SignosVitales.PresionArterial ?? "--/--", temp = c.SignosVitales.Temperatura?.ToString("0.0") ?? "--", fc = c.SignosVitales.FrecuenciaCardiaca?.ToString() ?? "--", sat = c.SignosVitales.SaturacionOxigeno?.ToString() ?? "--", peso = c.SignosVitales.Peso?.ToString("0.00") ?? "--", talla = c.SignosVitales.Altura?.ToString("0.00") ?? "--", bmi = c.SignosVitales.BMI?.ToString("0.1") ?? "--.-" } : null, items = c.ConsultaDetalles.Select(d => new { descripcion = d.Descripcion, tipo = d.TipoItem, cant = d.Cantidad, precio = d.PrecioUnitario?.ToString("N2") ?? "0.00", subtotal = d.Subtotal?.ToString("N2") ?? "0.00" }) });
            return Json(new { success = true, data = res });
        }
        catch (Exception ex) { return Json(new { success = false, message = ex.Message }); }
    }

    [HttpGet]
    public async Task<IActionResult> GetMonedaConfig()
    {
        var config = await _context.ConfiguracionesMoneda.Include(c => c.MonedaBase).FirstOrDefaultAsync();
        if (config?.MonedaBase == null) return Json(new { success = false });
        return Json(new { success = true, id = config.IdMonedaBase, simbolo = config.MonedaBase.Simbolo ?? "$", codigo = config.MonedaBase.Codigo });
    }

    private string GetMesNombre(int mes)
    {
        return mes switch { 1 => "Ene", 2 => "Feb", 3 => "Mar", 4 => "Abr", 5 => "May", 6 => "Jun", 7 => "Jul", 8 => "Ago", 9 => "Sep", 10 => "Oct", 11 => "Nov", 12 => "Dic", _ => "" };
    }
}
