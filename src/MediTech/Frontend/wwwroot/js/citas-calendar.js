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
                        </div>`;
                    return;
                }
                
                let html = '';
                data.forEach(c => {
                    let statusBadge = '';
                    let borderClass = 'border-start-primary'; // Default

                    if (c.estadoId === 2) {
                        statusBadge = '<span class="badge rounded-pill bg-warning text-dark small" style="font-size: 0.65rem;">EN PROCESO</span>';
                        borderClass = 'border-start-warning';
                    } else if (c.estadoId === 3) {
                        statusBadge = '<span class="badge rounded-pill bg-success text-white small" style="font-size: 0.65rem;">REALIZADA</span>';
                        borderClass = 'border-start-success';
                    } else if (c.estadoId === 4) {
                        statusBadge = '<span class="badge rounded-pill bg-danger text-white small" style="font-size: 0.65rem;">CANCELADA</span>';
                        borderClass = 'border-start-danger';
                    }

                    html += `
                        <div class="today-card mb-2 p-3 border rounded-3 bg-white shadow-sm position-relative ${borderClass}" style="cursor:pointer; transition: transform 0.2s; border-left-width: 4px !important;" 
                             onclick="window.openDetailsFromAgenda(${c.id})"
                             onmouseover="this.style.transform='translateY(-2px)'"
                             onmouseout="this.style.transform='translateY(0)'">
                            <div class="d-flex justify-content-between align-items-start">
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
                                <div class="ms-2">
                                    ${statusBadge}
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
        const colCancel = document.getElementById('btnCancelCita')?.parentElement;
        
        btnGroupActions.innerHTML = ''; 

        // Visibility of Cancel Button (Only for Programada - Estado 1)
        if (data.estadoId === 1) {
            colCancel.classList.remove('d-none');
            btnGroupActions.className = "col-6";
        } else {
            colCancel.classList.add('d-none');
            btnGroupActions.className = "col-12";
        }

        let actionHtml = '';

        // Status Badge (only if not Programada)
        if (data.estadoId === 2) {
            actionHtml += `<button type="button" class="btn text-white w-100 fw-semibold py-2 d-flex align-items-center justify-content-center gap-2 mb-2" style="background-color: #4F46E5; border-radius: 8px;" onclick="window.iniciarConsultaJS(${data.id})"><i class="bi bi-stethoscope fs-5"></i><span>Iniciar Consulta</span></button>`;
        } else if (data.estadoId === 3) {
            actionHtml += `<span class="badge bg-success w-100 p-3 fs-6 rounded-3 d-flex align-items-center justify-content-center gap-2 mb-2"><i class="bi bi-check-circle fs-5"></i><span>Cita Realizada</span></span>`;
        } else if (data.estadoId === 4) {
            actionHtml += `<span class="badge bg-danger w-100 p-3 fs-6 rounded-3 d-flex align-items-center justify-content-center gap-2 mb-2"><i class="bi bi-x-circle fs-5"></i><span>Cita Cancelada</span></span>`;
        }

        // Action Button (Arrival or Conversion)
        if (data.estadoId === 1 && data.pacienteId !== null) {
            actionHtml = `
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-success text-white w-100 fw-semibold py-2 d-flex align-items-center justify-content-center gap-2" style="border-radius: 8px;" onclick="window.marcarAtendida(${data.id})"><i class="bi bi-check2-circle fs-5"></i><span>Confirmar Llegada</span></button>
                    <a href="/Pacientes/Ficha/${data.pacienteId}" class="btn text-white fw-semibold py-2 d-flex align-items-center justify-content-center px-3" style="background-color: #4F46E5; border-radius: 8px;"><i class="bi bi-folder2-open"></i></a>
                </div>`;
        } else if (data.pacienteId === null) {
            // Prospects always keep the conversion button
            actionHtml += `<button type="button" class="btn text-white w-100 fw-semibold py-2 d-flex align-items-center justify-content-center gap-2" style="background-color: #4F46E5; border-radius: 8px;" onclick="window.abrirModalConversionJS(${data.id}, ${data.posiblePacienteId})"><i class="bi bi-person-check fs-5"></i><span>Convertir a Paciente</span></button>`;
        }

        btnGroupActions.innerHTML = actionHtml;

        // Click Handler for Cancel
        const btnCancel = document.getElementById('btnCancelCita');
        if (btnCancel) {
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
            
            // Add CSRF Token
            const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            if (token) formData.append('__RequestVerificationToken', token);
            
            fetch('/Citas/CreateProspectoJson', { 
                method: 'POST', 
                body: formData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            })
            .then(r => {
                if (!r.ok) throw new Error(`Server returned ${r.status}`);
                return r.json();
            })
            .then(data => {
                if (data.success) {
                    document.getElementById('PosiblePacienteId').value = data.id;
                    submitAppointmentFinal();
                } else {
                    MediToast.error(data.message);
                    btn.disabled = false;
                    btn.innerHTML = 'Agendar Cita';
                }
            })
            .catch(err => {
                console.error('Error creating prospect:', err);
                MediToast.error("Error de conexión al crear prospecto.");
                btn.disabled = false;
                btn.innerHTML = 'Agendar Cita';
            });
        } else {
            submitAppointmentFinal();
        }
    };

    function submitAppointmentFinal() {
        const form = document.getElementById('formCita');
        const btn = document.getElementById('btnGuardarCita');
        
        fetch('/Citas/CreateJson', { method: 'POST', body: new FormData(form) })
            .then(r => {
                if (!r.ok) throw new Error(`Server returned ${r.status}`);
                return r.json();
            })
            .then(data => {
                if (data.success) {
                    calendar?.refetchEvents();
                    window.loadTodayAgenda();
                    bootstrap.Modal.getInstance(document.getElementById('modalCrearCita')).hide();
                    MediToast.success("Cita agendada correctamente.");
                } else {
                    const alertEl = document.getElementById('modalAlert');
                    if (alertEl) {
                        alertEl.textContent = data.message;
                        alertEl.classList.remove('d-none');
                    } else {
                        MediToast.error(data.message);
                    }
                }
            })
            .catch(err => {
                console.error('Error saving appointment:', err);
                MediToast.error("Error de conexión al agendar cita.");
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
            .then(r => {
                if (!r.ok) throw new Error(`Server returned ${r.status}`);
                return r.json();
            })
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
            .catch(err => {
                console.error('Error during conversion:', err);
                MediToast.error("Error de conexión durante la conversión.");
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
            .then(r => {
                if (!r.ok) throw new Error(`Server returned ${r.status}`);
                return r.json();
            })
            .then(data => {
                if (data.success) {
                    window.location.href = `/Pacientes/Ficha/${data.idPaciente}?consultaId=${data.idConsulta}&modo=consulta`;
                } else {
                    MediToast.error(data.error);
                }
            })
            .catch(err => {
                console.error('Error saving reception:', err);
                MediToast.error("Error de conexión al guardar recepción.");
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Guardar';
            });
    };

    window.marcarAtendida = function(idCita) {
        MediConfirm.show({ title: 'Confirmar llegada', message: '¿Marcar paciente como presente?', variant: 'success' })
            .then(confirmed => {
                if (!confirmed) return;
                
                const formData = new FormData();
                const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
                if (token) formData.append('__RequestVerificationToken', token);

                fetch(`/Citas/MarcarAtendida/${idCita}`, { method: 'POST', body: formData })
                    .then(r => {
                        if (!r.ok) throw new Error(`Server returned ${r.status}`);
                        return r.json();
                    })
                    .then(data => {
                        if (data.success) {
                            MediToast.success("Llegada confirmada.");
                            calendar?.refetchEvents();
                            bootstrap.Modal.getInstance(document.getElementById('modalDetalleCita')).hide();
                            window.loadTodayAgenda();
                        } else {
                            MediToast.error(data.message);
                        }
                    })
                    .catch(err => {
                        console.error('Error marking attended:', err);
                        MediToast.error("Error de conexión al marcar llegada.");
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

    // --- Restored Autocomplete Logic ---

    // 1. Patient Search
    const patientSearchInput = document.getElementById('modalPacienteSearch');
    const patientResultsDiv = document.getElementById('pacienteSearchResults');
    
    patientSearchInput?.addEventListener('input', debounce(function() {
        const term = this.value;
        if (term.length < 2) {
            patientResultsDiv.style.display = 'none';
            return;
        }

        fetch(`/Citas/BuscarPacientes?term=${encodeURIComponent(term)}`)
            .then(r => r.json())
            .then(data => {
                if (!data || data.length === 0) {
                    patientResultsDiv.style.display = 'none';
                    return;
                }
                
                patientResultsDiv.innerHTML = data.map(p => {
                    const extraFields = p.isProspect ? 
                        `'${p.primerNombre || ''}', '${p.segundoNombre || ''}', '${p.primerApellido || ''}', '${p.segundoApellido || ''}'` : 
                        "null, null, null, null";
                    
                    return `
                        <button type="button" class="list-group-item list-group-item-action py-2 px-3 small border-0 border-bottom" 
                                onclick="window.selectPatientFromSearch(${p.id}, '${p.label}', '${p.telefono || ''}', ${p.isProspect}, ${extraFields})">
                            <i class="bi bi-person${p.isProspect ? '-plus text-warning' : '-check text-primary'} me-2"></i> ${p.label}
                        </button>`;
                }).join('');
                patientResultsDiv.style.display = 'block';
            });
    }, 400));

    window.selectPatientFromSearch = function(id, label, telefono, isProspect, pNome, sNome, pApel, sApel) {
        const telInput = document.getElementById('modalTelefono');

        if (isProspect) {
            document.getElementById('PosiblePacienteId').value = id;
            document.getElementById('PacienteId').value = "";
            
            // Fill prospect fields
            document.getElementById('modalProspectoNombre').value = pNome || "";
            document.getElementById('modalProspectoSegundoNombre').value = sNome || "";
            document.getElementById('modalProspectoApellido').value = pApel || "";
            document.getElementById('modalProspectoSegundoApellido').value = sApel || "";
            
            // Switch to Prospect Tab
            document.getElementById('tipoNuevoProspecto').checked = true;
            window.toggleFields('prospecto');

        } else {
            document.getElementById('PacienteId').value = id;
            document.getElementById('PosiblePacienteId').value = "";
            
            // Switch to Patient Tab (in case it was on prospect)
            document.getElementById('tipoPacienteExistente').checked = true;
            window.toggleFields('paciente');
        }
        
        patientSearchInput.value = label;
        patientResultsDiv.style.display = 'none';
        
        // Auto-fill phone
        if (telefono) {
            if (telInput) telInput.value = telefono;
            document.getElementById('phoneMatchAlert')?.classList.add('d-none');
        }
    };

    // 2. Treatment Search
    const treatmentSearchInput = document.getElementById('modalTratamientoSearch');
    const treatmentResultsDiv = document.getElementById('tratamientoSearchResults');
    
    treatmentSearchInput?.addEventListener('input', debounce(function() {
        const term = this.value;
        if (term.length < 2) {
            treatmentResultsDiv.style.display = 'none';
            return;
        }

        fetch(`/Citas/BuscarTratamientos?term=${encodeURIComponent(term)}`)
            .then(r => r.json())
            .then(data => {
                if (!data || data.length === 0) {
                    treatmentResultsDiv.style.display = 'none';
                    return;
                }
                
                treatmentResultsDiv.innerHTML = data.map(t => `
                    <button type="button" class="list-group-item list-group-item-action py-2 px-3 small border-0 border-bottom" 
                            onclick="window.selectTreatmentFromSearch(${t.id}, '${t.nombre}')">
                        <i class="bi bi-heart-pulse text-primary me-2"></i> ${t.nombre}
                    </button>
                `).join('');
                treatmentResultsDiv.style.display = 'block';
            });
    }, 400));

    window.selectTreatmentFromSearch = function(id, nombre) {
        document.getElementById('modalTratamientoId').value = id;
        treatmentSearchInput.value = nombre;
        treatmentResultsDiv.style.display = 'none';
    };

    // 3. Phone Match Logic
    const phoneInput = document.getElementById('modalTelefono');
    const phoneAlert = document.getElementById('phoneMatchAlert');
    
    phoneInput?.addEventListener('input', debounce(function() {
        const val = this.value.replace(/\D/g, '');
        if (val.length < 8) {
            phoneAlert?.classList.add('d-none');
            return;
        }

        fetch(`/Citas/BuscarPacientePorTelefono?telefono=${val}`)
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    lastMatchData = data;
                    phoneAlert?.classList.remove('d-none');
                } else {
                    phoneAlert?.classList.add('d-none');
                }
            });
    }, 600));

    window.useExistingRecord = function() {
        if (!lastMatchData) return;
        
        if (lastMatchData.isProspect) {
            document.getElementById('PosiblePacienteId').value = lastMatchData.id;
            document.getElementById('PacienteId').value = "";
        } else {
            document.getElementById('PacienteId').value = lastMatchData.id;
            document.getElementById('PosiblePacienteId').value = "";
        }
        
        if (patientSearchInput) patientSearchInput.value = lastMatchData.nombre;
        
        document.getElementById('tipoPacienteExistente').checked = true;
        window.toggleFields('paciente');
        phoneAlert?.classList.add('d-none');
        
        MediToast.success("Viculado correctamente.");
    };

    // Close autocompletes on click outside
    document.addEventListener('click', e => {
        if (!patientResultsDiv?.contains(e.target) && e.target !== patientSearchInput) {
            patientResultsDiv.style.display = 'none';
        }
        if (!treatmentResultsDiv?.contains(e.target) && e.target !== treatmentSearchInput) {
            treatmentResultsDiv.style.display = 'none';
        }
    });

    // Startup
    window.loadTodayAgenda();
});
