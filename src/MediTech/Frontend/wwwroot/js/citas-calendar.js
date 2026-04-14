/**
 * Meditech - Agenda & Calendar Management System
 * Refactored for global accessibility (Dashboard + Citas Module)
 */

document.addEventListener('DOMContentLoaded', function () {
    // 1. Core DOM References
    const calendarEl = document.getElementById('fullcalendar');
    const agendaBody = document.getElementById('agendaHoyList');
    const dashAgendaBody = document.getElementById('agendaHoyListDashboard');
    
    // Calendar Navigation Elements
    const titleEl = document.getElementById('calendarTitle');
    const btnToday = document.getElementById('btnToday');
    const btnPrev = document.getElementById('btnPrevMonth');
    const btnNext = document.getElementById('btnNextMonth');
    const btnViewMonth = document.getElementById('btnViewMonth');
    const btnViewWeek = document.getElementById('btnViewWeek');
    const btnViewDay = document.getElementById('btnViewDay');
    
    // Shared Global Variables
    let calendar = null;
    let phoneTimeout = null;
    let lastMatchData = null;

    // 2. FullCalendar Initialization (Conditional)
    if (calendarEl && typeof FullCalendar !== 'undefined') {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            locale: 'es',
            headerToolbar: false,
            nowIndicator: true,
            allDaySlot: false,
            slotMinTime: '06:00:00',
            slotDuration: '00:30:00',
            slotLabelInterval: '01:00:00',
            height: '100%',
            expandRows: true,
            selectable: true,
            dayHeaderFormat: { weekday: 'short', day: 'numeric' },
            eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },
            events: '/Citas/GetEvents',
            
            eventContent: function(arg) {
                let treatmentText = arg.event.extendedProps.tratamiento || 'General';
                let timeText = arg.timeText;
                let isCanceled = arg.event.extendedProps.estadoId === 4;
                let canceledClass = isCanceled ? 'event-canceled' : '';
                
                return { 
                    html: `<div class="custom-event-content ${canceledClass}">
                                <div class="custom-event-time">${timeText}</div>
                                <div class="custom-event-title">${arg.event.title}</div>
                                <div class="custom-event-treatment">${treatmentText}</div>
                           </div>` 
                };
            },
            select: info => window.openCreateModal?.(info.start),
            eventClick: info => {
                info.jsEvent.preventDefault();
                window.showEventModal?.(info.event);
            },
            datesSet: info => updateCalendarTitle(info.view)
        });

        calendar.render();
        
        // Initial setup for view buttons
        const viewButtons = [btnViewMonth, btnViewWeek, btnViewDay];
        if (btnViewWeek) updateActiveButton(btnViewWeek, viewButtons);

        // Navigation Handlers
        btnToday?.addEventListener('click', () => calendar.today());
        btnPrev?.addEventListener('click', () => calendar.prev());
        btnNext?.addEventListener('click', () => calendar.next());
        
        btnViewMonth?.addEventListener('click', () => { calendar.changeView('dayGridMonth'); updateActiveButton(btnViewMonth, viewButtons); });
        btnViewWeek?.addEventListener('click', () => { calendar.changeView('timeGridWeek'); updateActiveButton(btnViewWeek, viewButtons); });
        btnViewDay?.addEventListener('click', () => { calendar.changeView('timeGridDay'); updateActiveButton(btnViewDay, viewButtons); });

        // Responsive Adjustment
        adjustCalendarView(calendar, [btnViewMonth, btnViewWeek, btnViewDay]);
        window.addEventListener('resize', debounce(() => adjustCalendarView(calendar, viewButtons), 250));

        // Unhide after load
        setTimeout(() => {
            const loadingEl = document.getElementById('fullcalendar-loading');
            if (loadingEl) loadingEl.style.display = 'none';
            calendarEl.style.opacity = '1';
        }, 500);
    }

    // 3. Global Functions (Exposed to Window)

    // A. Load Agenda List (Dashboard or Offcanvas)
    window.loadTodayAgenda = function(targetId) {
        const target = targetId ? document.getElementById(targetId) : (agendaBody || dashAgendaBody);
        if (!target) return;

        target.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary spinner-border-sm" role="status"></div></div>';
        
        fetch('/Citas/Hoy')
            .then(r => r.json())
            .then(data => {
                if (!data || data.length === 0) {
                    target.innerHTML = `
                        <div class="text-center text-muted p-5">
                            <i class="bi bi-calendar-x fs-2 opacity-50 mb-2 d-block"></i>
                            <p class="small fw-semibold mb-0">No hay citas para hoy</p>
                            <button class="btn btn-sm btn-link text-decoration-none mt-1" onclick="window.openCreateModal()">Agendar</button>
                        </div>`;
                    return;
                }
                
                let html = '';
                data.forEach(c => {
                    const isAttended = c.estadoId === 2 || c.estadoId === 3;
                    const statusClass = isAttended ? 'text-success' : 'text-muted';
                    const statusIcon = isAttended ? 'bi-check-circle-fill' : 'bi-circle';

                    html += `
                        <div class="today-card mb-2 p-3 border rounded-3 bg-white shadow-sm" style="cursor:pointer; transition: transform 0.2s;" 
                             onclick="window.openDetailsFromAgenda(${c.id})"
                             onmouseover="this.style.transform='translateY(-2px)'"
                             onmouseout="this.style.transform='translateY(0)'">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="flex-grow-1">
                                    <div class="d-flex align-items-center gap-2 mb-1">
                                        <span class="badge bg-light text-primary border" style="font-size: 0.7rem;">
                                            ${formatAmPm(c.horaInicio)}
                                        </span>
                                        <span class="fw-bold text-dark" style="font-size: 0.9rem;">${c.paciente}</span>
                                    </div>
                                    <div class="text-muted small">
                                        <i class="bi bi-heart-pulse me-1"></i>${c.tratamiento}
                                    </div>
                                </div>
                                <div class="${statusClass}">
                                    <i class="bi ${statusIcon} fs-5"></i>
                                </div>
                            </div>
                        </div>`;
                });
                target.innerHTML = html;
            })
            .catch(err => {
                console.error('Error loading agenda:', err);
                target.innerHTML = '<div class="alert alert-danger small p-2">Error al cargar agenda</div>';
            });
    };

    // B. Detail Modal Handlers
    window.openDetailsFromAgenda = function(id) {
        if (calendar) {
            const evt = calendar.getEventById(id);
            if (evt) {
                window.showEventModal(evt);
                return;
            }
        }
        
        // Fallback or Dashboard use
        fetch(`/Citas/GetEventDetail/${id}`)
            .then(r => r.json())
            .then(data => showEventModalWithData(data));
    };

    window.showEventModal = function(event) {
        fetch(`/Citas/GetEventDetail/${event.id}`)
            .then(r => r.json())
            .then(data => showEventModalWithData(data));
    };

    function showEventModalWithData(data) {
        const modalDetalleEl = document.getElementById('modalDetalleCita');
        if (!modalDetalleEl) return;

        // Populate basic info
        document.getElementById('detailPacienteNombre').textContent = data.paciente;
        document.getElementById('detailPacienteId').textContent = data.identificacion ? `Cédula: ${data.identificacion}` : '';
        document.getElementById('detailHorario').textContent = `${data.horaInicio} - ${data.horaFin}`;
        document.getElementById('detailFecha').textContent = data.fecha;
        document.getElementById('detailTelefono').textContent = data.telefono || 'No especificado';
        document.getElementById('detailTratamiento').textContent = data.tratamiento;

        const obsRow = document.getElementById('detailObsRow');
        if(data.observaciones && data.observaciones.trim() !== '') {
            document.getElementById('detailObservaciones').textContent = data.observaciones;
            obsRow.style.display = 'flex';
        } else {
            obsRow.style.setProperty('display', 'none', 'important');
        }

        document.getElementById('detailProspectBadge').style.display = (data.pacienteId === null) ? 'inline-block' : 'none';

        // Action Buttons Logic
        const btnGroupActions = document.getElementById('btnGroupActions');
        btnGroupActions.innerHTML = ''; 

        if (data.pacienteId === null) {
            btnGroupActions.innerHTML = `<button type="button" class="btn text-white w-100 fw-semibold py-2" style="background-color: #4F46E5; border-radius: 8px;" onclick="window.abrirModalConversionJS(${data.id}, ${data.posiblePacienteId})"><i class="bi bi-person-check me-1"></i> Convertir a Paciente</button>`;
        } else {
            if (data.estadoId === 1) { 
                btnGroupActions.innerHTML = `
                    <button type="button" class="btn btn-success text-white w-100 fw-semibold py-2" style="border-radius: 8px;" onclick="window.marcarAtendida(${data.id})"><i class="bi bi-check2-circle me-1"></i> Confirmar Llegada</button>
                    <a href="/Pacientes/Ficha/${data.pacienteId}" class="btn text-white fw-semibold py-2" style="background-color: #4F46E5; border-radius: 8px;"><i class="bi bi-folder2-open"></i></a>`;
            } else if (data.estadoId === 2) { 
                btnGroupActions.innerHTML = `<button type="button" class="btn text-white w-100 fw-semibold py-2" style="background-color: #4F46E5; border-radius: 8px;" onclick="window.iniciarConsultaJS(${data.id})"><i class="bi bi-stethoscope me-1"></i> Iniciar Consulta</button>`;
            } else if (data.estadoId === 3) {
                btnGroupActions.innerHTML = `<span class="badge bg-success w-100 p-3 fs-6 rounded-3"><i class="bi bi-check-circle me-1"></i> Cita Realizada</span>`;
            } else {
                btnGroupActions.innerHTML = `<span class="badge bg-danger w-100 p-3 fs-6 rounded-3">Cita Cancelada</span>`;
            }
        }

        // Cancel Button Toggle
        const btnCancel = document.getElementById('btnCancelCita');
        if (btnCancel) {
            btnCancel.style.display = (data.estadoId === 1) ? 'block' : 'none';
            btnCancel.onclick = () => confirmCancelCita(data.id);
        }

        new bootstrap.Modal(modalDetalleEl).show();
    }

    // C. Create Modal Handlers
    window.openCreateModal = function(startTime) {
        const modalEl = document.getElementById('modalCrearCita');
        if (!modalEl) return;
        
        const form = document.getElementById('formCita');
        if (form) form.reset();
        
        const start = (startTime && !isNaN(new Date(startTime))) ? new Date(startTime) : new Date();
        
        // Date & Time Initialization
        const dateInput = document.getElementById('modalFecha');
        if (dateInput) {
            dateInput.value = start.toISOString().split('T')[0];
        }
        
        const hInit = document.getElementById('HoraInicio');
        if (hInit) hInit.value = start.toTimeString().slice(0,5);
        
        const hEnd = document.getElementById('HoraFin');
        if (hEnd) {
            const end = new Date(start.getTime() + 30 * 60000);
            hEnd.value = end.toTimeString().slice(0,5);
        }

        // UI Reset
        document.getElementById('modalAlert')?.classList.add('d-none');
        document.getElementById('tipoPacienteExistente').checked = true;
        window.toggleFields('paciente');
        
        // Result Lists Clear
        ['pacienteSearchResults', 'tratamientoSearchResults'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        new bootstrap.Modal(modalEl).show();
    };

    // 4. Utility Functions (Internal)
    
    function updateCalendarTitle(view) {
        if (!titleEl || !view) return;
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        titleEl.textContent = `${months[view.currentStart.getMonth()]} ${view.currentStart.getFullYear()}`;
    }

    function formatAmPm(time) {
        if (!time) return '';
        const [h, m] = time.split(':');
        let hours = parseInt(h);
        const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2,'0')}:${m} ${ampm}`;
    }

    function updateActiveButton(activeBtn, buttons) {
        buttons.forEach(btn => {
            if(!btn) return;
            btn.classList.remove('active');
            btn.style.backgroundColor = '#FFF';
            btn.style.color = '#6B7280';
        });
        activeBtn.classList.add('active');
        activeBtn.style.backgroundColor = '#4F46E5';
        activeBtn.style.color = 'white';
    }

    function adjustCalendarView(cal, buttons) {
        const width = window.innerWidth;
        if (width < 576) {
            if (cal.view.type !== 'timeGridDay') {
                cal.changeView('timeGridDay');
                updateActiveButton(buttons[2], buttons);
            }
        } else if (width < 1200) {
            if (cal.view.type !== 'timeGridWeek') {
                cal.changeView('timeGridWeek');
                updateActiveButton(buttons[1], buttons);
            }
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), wait);
        };
    }

    function confirmCancelCita(id) {
        if (typeof MediConfirm === 'undefined') return;
        MediConfirm.show({
            title: '¿Cancelar esta cita?',
            message: 'La cita se marcará como cancelada y no se podrá deshacer.',
            variant: 'danger',
            confirmText: 'Sí, cancelar'
        }).then(confirmed => {
            if (!confirmed) return;
            
            const formData = new FormData();
            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            if (token) formData.append('__RequestVerificationToken', token);

            fetch(`/Citas/Cancel/${id}`, { method: 'POST', body: formData })
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        MediToast.success("Cita cancelada.");
                        calendar?.refetchEvents();
                        bootstrap.Modal.getInstance(document.getElementById('modalDetalleCita')).hide();
                        window.loadTodayAgenda();
                    } else {
                        MediToast.error(res.message);
                    }
                });
        });
    }

    // 5. Autocomplete & Form Global Listeners
    
    // Switch between Patient and Prospect fields
    window.toggleFields = function(type) {
        const pPanel = document.getElementById('pacientePanel');
        const prospectPanel = document.getElementById('prospectoPanel');
        if (pPanel) pPanel.style.display = type === 'paciente' ? 'block' : 'none';
        if (prospectPanel) prospectPanel.style.display = type === 'prospecto' ? 'block' : 'none';
        
        if (type === 'paciente') {
            document.getElementById('PosiblePacienteId').value = "";
        } else {
            document.getElementById('PacienteId').value = "";
        }
    };

    // Save Appointment
    window.guardarCita = function() {
        const form = document.getElementById('formCita');
        const btn = document.getElementById('btnGuardarCita');
        const alertEl = document.getElementById('modalAlert');
        const type = document.querySelector('input[name="tipoPaciente"]:checked').value;
        const phoneInput = document.getElementById('modalTelefono');

        if (alertEl) alertEl.classList.add('d-none');

        // Validation
        if (type === 'paciente' && !document.getElementById('PacienteId').value && !document.getElementById('PosiblePacienteId').value) {
            alertEl.textContent = "Seleccione un paciente de la lista.";
            alertEl.classList.remove('d-none');
            return;
        }

        if (!document.getElementById('modalTratamientoId').value) {
            alertEl.textContent = "Seleccione un tratamiento.";
            alertEl.classList.remove('d-none');
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>';

        // Phone Cleanup
        if (phoneInput) phoneInput.value = phoneInput.value.replace(/\D/g, '');

        // If new prospect, creates it first
        if (type === 'prospecto' && !document.getElementById('PosiblePacienteId').value) {
            const formData = new URLSearchParams();
            formData.append('primerNombre', document.getElementById('modalProspectoNombre').value);
            formData.append('primerApellido', document.getElementById('modalProspectoApellido').value);
            formData.append('telefono', phoneInput.value);
            
            fetch('/Citas/CreateProspectoJson', { 
                method: 'POST', 
                body: formData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('PosiblePacienteId').value = data.id;
                    submitAppointmentFinal();
                } else {
                    MediToast.error(data.message);
                    btn.disabled = false;
                    btn.innerHTML = 'Agendar Cita';
                }
            });
        } else {
            submitAppointmentFinal();
        }
    };

    function submitAppointmentFinal() {
        const form = document.getElementById('formCita');
        const btn = document.getElementById('btnGuardarCita');
        
        fetch('/Citas/CreateJson', { method: 'POST', body: new FormData(form) })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    calendar?.refetchEvents();
                    window.loadTodayAgenda();
                    bootstrap.Modal.getInstance(document.getElementById('modalCrearCita')).hide();
                } else {
                    const alertEl = document.getElementById('modalAlert');
                    if (alertEl) {
                        alertEl.textContent = data.message;
                        alertEl.classList.remove('d-none');
                    }
                }
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = 'Agendar Cita';
            });
    }

    // Modal Conversion Support
    window.abrirModalConversionJS = function(idCita, idPosP) {
        const detModal = bootstrap.Modal.getInstance(document.getElementById('modalDetalleCita'));
        if (detModal) detModal.hide();
        
        document.getElementById('convertIdCita').value = idCita;
        document.getElementById('convertIdPosiblePaciente').value = idPosP;
        new bootstrap.Modal(document.getElementById('modalConvertir')).show();
    };

    window.ejecutarConversion = function() {
        const form = document.getElementById('formConvertir');
        const btn = document.getElementById('btnConfirmConversion');
        if (!form.checkValidity()) { form.reportValidity(); return; }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>';

        fetch('/Citas/ConvertirProspecto', { method: 'POST', body: new FormData(form) })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    MediToast.success('Conversión finalizada');
                    calendar?.refetchEvents();
                    bootstrap.Modal.getInstance(document.getElementById('modalConvertir')).hide();
                    window.loadTodayAgenda();
                } else {
                    MediToast.error(data.message);
                }
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Finalizar Conversión';
            });
    };

    // Reception Support
    window.iniciarConsultaJS = function(idCita) {
        bootstrap.Modal.getInstance(document.getElementById('modalDetalleCita'))?.hide();

        fetch(`/Citas/GetRecepcionData/${idCita}`)
            .then(r => r.json())
            .then(data => {
                if (!data.success) return MediToast.error(data.error);

                document.getElementById('recIdCita').value = data.idCita;
                document.getElementById('recIdMedico').value = data.idMedico;
                document.getElementById('recIdEstado').value = data.idEstado;
                document.getElementById('recIdConsulta').value = data.idConsulta;

                document.getElementById('recepcionPacienteNombre').textContent = data.pacienteNombre;
                document.getElementById('recepcionFechaHora').textContent = data.fechaHora;
                document.getElementById('recepcionTratamiento').textContent = data.tratamiento;

                const fields = ['recPresion', 'recTemp', 'recFC', 'recSat', 'recPeso', 'recAltura'];
                fields.forEach(f => {
                    const val = data.signos ? data.signos[f.replace('rec', '').charAt(0).toLowerCase() + f.replace('rec', '').slice(1)] : '';
                    const el = document.getElementById(f);
                    if (el) el.value = val || '';
                });

                document.getElementById('recMotivo').value = data.motivo || data.tratamiento || '';
                document.getElementById('recObservaciones').value = data.observaciones || '';
                
                window.calcularIMCRecepcion?.();
                new bootstrap.Modal(document.getElementById('modalRecepcion')).show();
            });
    };

    window.guardarRecepcion = function() {
        const form = document.getElementById('formRecepcion');
        const btn = document.getElementById('btnGuardarRecepcion');
        
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>';

        fetch('/Citas/GuardarRecepcion', { method: 'POST', body: new FormData(form) })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    window.location.href = `/Pacientes/Ficha/${data.idPaciente}?consultaId=${data.idConsulta}&modo=consulta`;
                } else {
                    MediToast.error(data.error);
                    btn.disabled = false;
                    btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Guardar';
                }
            });
    };

    window.marcarAtendida = function(idCita) {
        MediConfirm.show({ title: 'Confirmar llegada', message: '¿Marcar paciente como presente?', variant: 'success' })
            .then(confirmed => {
                if (!confirmed) return;
                fetch(`/Citas/MarcarAtendida/${idCita}`, { method: 'POST' })
                    .then(r => r.json())
                    .then(data => {
                        if (data.success) {
                            MediToast.success("Llegada confirmada.");
                            calendar?.refetchEvents();
                            bootstrap.Modal.getInstance(document.getElementById('modalDetalleCita')).hide();
                            window.loadTodayAgenda();
                        }
                    });
            });
    };

    // IMC Simple Logic
    window.calcularIMCRecepcion = function() {
        const peso = parseFloat(document.getElementById('recPeso')?.value || 0);
        const altura = parseFloat(document.getElementById('recAltura')?.value || 0);
        if (peso > 0 && altura > 0) {
            const imc = (peso / 2.205) / ((altura/100) * (altura/100));
            const elVal = document.getElementById('recImcValue');
            const elStat = document.getElementById('recImcStatus');
            if (elVal) elVal.textContent = imc.toFixed(1);
            if (elStat) {
                if (imc < 18.5) elStat.textContent = "Bajo peso";
                else if (imc < 25) elStat.textContent = "Normal";
                else elStat.textContent = "Sobrepeso/Obesidad";
            }
        }
    };

    // Startup
    window.loadTodayAgenda();
});
