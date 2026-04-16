-- ============================================================
-- MediTech — Script de Limpieza para Producción
-- ============================================================
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
BEGIN TRANSACTION;
BEGIN TRY

    PRINT '=== INICIO DE LIMPIEZA PARA PRODUCCIÓN ===';

    -- ────────────────────────────────────────────
    -- 1. DOCUMENTOS Y FOTOS (sin FK entrantes)
    -- ────────────────────────────────────────────
    PRINT '1. Limpiando documentos y fotos...';
    DELETE FROM DOC.CONSENTIMIENTOS_FIRMADOS;
    DELETE FROM DOC.CONSENTIMIENTOS;
    DELETE FROM DOC.DOCUMENTOS_CLINICOS;
    DELETE FROM DOC.FOTOS_PACIENTE;
    DELETE FROM CLI.FOTOS_CLINICAS;

    -- ────────────────────────────────────────────
    -- 2. FACTURACIÓN (CAJA) — hijos antes que padres
    -- ────────────────────────────────────────────
    PRINT '2. Limpiando facturación...';
    DELETE FROM CAJA.PAGOS;
    DELETE FROM CAJA.CUENTA_DETALLE;
    DELETE FROM CAJA.CUENTAS;

    -- ────────────────────────────────────────────
    -- 3. CLÍNICA — orden por dependencias FK
    -- ────────────────────────────────────────────
    PRINT '3. Limpiando datos clínicos...';
    DELETE FROM CLI.EXAMENES;
    DELETE FROM CLI.SIGNOS_VITALES;
    DELETE FROM CLI.DIAGNOSTICOS;
    DELETE FROM CLI.CONSULTA_DETALLE;
    DELETE FROM CLI.CONSULTAS;
    DELETE FROM CLI.HISTORIAL_CLINICO;
    DELETE FROM CLI.ASISTENCIA_CITAS;
    DELETE FROM CLI.CITAS;
    DELETE FROM CLI.POSIBLES_PACIENTES;
    DELETE FROM CLI.PACIENTES;

    -- ────────────────────────────────────────────
    -- 4. INVENTARIO
    -- ────────────────────────────────────────────
    PRINT '4. Limpiando inventario...';
    DELETE FROM INV.MOVIMIENTOS_INVENTARIO;
    DELETE FROM INV.PRODUCTOS;

    -- ────────────────────────────────────────────
    -- 5. TURNOS DE CAJA
    -- ────────────────────────────────────────────
    PRINT '5. Limpiando turnos de caja...';
    DELETE FROM ADM.TURNOS_CAJA;

    -- ────────────────────────────────────────────
    -- 6. TRATAMIENTOS — Limpiar todo el catálogo
    -- ────────────────────────────────────────────
    PRINT '6. Limpiando tratamientos...';
    DELETE FROM CAT.TRATAMIENTOS;

    -- ────────────────────────────────────────────
    -- 7. USUARIOS DE PRUEBA (doctor, asistente)
    --    Conservar: admin (9107), daren (9108)
    -- ────────────────────────────────────────────
    PRINT '7. Limpiando usuarios de prueba...';
    DELETE FROM ADM.USUARIO_MODULOS WHERE ID_USUARIO NOT IN (9107, 9108);
    DELETE FROM ADM.USUARIOS          WHERE ID_USUARIO NOT IN (9107, 9108);
    DELETE FROM ADM.EMPLEADOS         WHERE ID_PERSONA NOT IN (9321, 10336);

    -- ────────────────────────────────────────────
    -- 8. PERSONAS — Eliminar todas excepto admin y daren
    -- ────────────────────────────────────────────
    PRINT '8. Limpiando personas de prueba...';
    DELETE FROM ADM.PERSONAS WHERE ID_PERSONA NOT IN (9321, 10336);

    -- ────────────────────────────────────────────
    -- 9. TASAS DE CAMBIO INACTIVAS
    -- ────────────────────────────────────────────
    PRINT '9. Limpiando tasas de cambio inactivas...';
    DELETE FROM ADM.TASA_CAMBIO WHERE ACTIVO = 0;

    -- ────────────────────────────────────────────
    -- 10. RESEED IDENTITY COLUMNS (Empezar IDs desde 1)
    -- ────────────────────────────────────────────
    PRINT '10. Reseteando contadores de identidad...';
    -- Clínica
    DBCC CHECKIDENT ('CLI.CITAS',             RESEED, 0);
    DBCC CHECKIDENT ('CLI.CONSULTAS',         RESEED, 0);
    DBCC CHECKIDENT ('CLI.CONSULTA_DETALLE',  RESEED, 0);
    DBCC CHECKIDENT ('CLI.PACIENTES',         RESEED, 0);
    DBCC CHECKIDENT ('CLI.POSIBLES_PACIENTES',RESEED, 0);
    DBCC CHECKIDENT ('CLI.EXAMENES',          RESEED, 0);
    DBCC CHECKIDENT ('CLI.SIGNOS_VITALES',    RESEED, 0);
    DBCC CHECKIDENT ('CLI.HISTORIAL_CLINICO', RESEED, 0);
    DBCC CHECKIDENT ('CLI.FOTOS_CLINICAS',    RESEED, 0);
    -- Documentos
    DBCC CHECKIDENT ('DOC.DOCUMENTOS_CLINICOS', RESEED, 0);
    -- Facturación
    DBCC CHECKIDENT ('CAJA.CUENTAS',          RESEED, 0);
    DBCC CHECKIDENT ('CAJA.CUENTA_DETALLE',   RESEED, 0);
    DBCC CHECKIDENT ('CAJA.PAGOS',            RESEED, 0);
    -- Inventario
    DBCC CHECKIDENT ('INV.PRODUCTOS',         RESEED, 0);
    DBCC CHECKIDENT ('INV.MOVIMIENTOS_INVENTARIO', RESEED, 0);
    -- Tratamientos
    DBCC CHECKIDENT ('CAT.TRATAMIENTOS',      RESEED, 0);

    COMMIT;
    PRINT '';
    PRINT '=== ✅ LIMPIEZA COMPLETADA EXITOSAMENTE ===';
    PRINT '';

    -- Verificación final
    PRINT '--- VERIFICACIÓN POST-LIMPIEZA ---';
    SELECT 'CAT.ESTADOS'             AS Tabla, COUNT(*) AS Registros FROM CAT.ESTADOS
    UNION ALL SELECT 'CAT.GENEROS',             COUNT(*) FROM CAT.GENEROS
    UNION ALL SELECT 'CAT.TIPO_IDENTIFICACION', COUNT(*) FROM CAT.TIPO_IDENTIFICACION
    UNION ALL SELECT 'CAT.ROLES',               COUNT(*) FROM CAT.ROLES
    UNION ALL SELECT 'CAT.ESTADO_CITA',         COUNT(*) FROM CAT.ESTADO_CITA
    UNION ALL SELECT 'CAT.MONEDAS',             COUNT(*) FROM CAT.MONEDAS
    UNION ALL SELECT 'CAT.TRATAMIENTOS',        COUNT(*) FROM CAT.TRATAMIENTOS
    UNION ALL SELECT 'ADM.MODULOS',             COUNT(*) FROM ADM.MODULOS
    UNION ALL SELECT 'ADM.USUARIOS',            COUNT(*) FROM ADM.USUARIOS
    UNION ALL SELECT 'ADM.PERSONAS',            COUNT(*) FROM ADM.PERSONAS
    UNION ALL SELECT 'ADM.EMPLEADOS',           COUNT(*) FROM ADM.EMPLEADOS
    UNION ALL SELECT 'ADM.CONFIGURACION_MONEDA',COUNT(*) FROM ADM.CONFIGURACION_MONEDA
    UNION ALL SELECT 'ADM.TASA_CAMBIO',         COUNT(*) FROM ADM.TASA_CAMBIO
    UNION ALL SELECT 'CLI.PACIENTES',           COUNT(*) FROM CLI.PACIENTES
    UNION ALL SELECT 'CLI.CITAS',               COUNT(*) FROM CLI.CITAS
    UNION ALL SELECT 'INV.PRODUCTOS',           COUNT(*) FROM INV.PRODUCTOS
    UNION ALL SELECT 'CAJA.CUENTAS',            COUNT(*) FROM CAJA.CUENTAS
    ORDER BY Tabla;

END TRY
BEGIN CATCH
    ROLLBACK;
    PRINT '=== ❌ ERROR — SE REVIRTIERON TODOS LOS CAMBIOS ===';
    PRINT 'Error: ' + ERROR_MESSAGE();
    PRINT 'Línea: ' + CAST(ERROR_LINE() AS VARCHAR(10));
END CATCH
