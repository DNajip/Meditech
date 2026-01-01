use MediTech
go



/* ----  Procedimiento de almacenado ------ */

-- VALIDAR USUARIO PARA INICIO DE SESION
/* 1: lOGIN CORRECTO
  -1: usuario no existe
  -2: usuario inactivo
  -3: Contraseña incorrecta
*/

CREATE PROCEDURE sp_login_usuario
    @cedula VARCHAR(30),
    @password VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Usuario no existe
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE cedula = @cedula)
    BEGIN
        SELECT -1 AS resultado;
        RETURN;
    END

    -- 2. Usuario inactivo
    IF EXISTS (
        SELECT 1 
        FROM usuarios 
        WHERE cedula = @cedula AND estado = 0
    )
    BEGIN
        SELECT -2 AS resultado;
        RETURN;
    END

    -- 3. Contraseña incorrecta
    IF NOT EXISTS (
        SELECT 1 
        FROM usuarios 
        WHERE cedula = @cedula 
          AND password = @password
    )
    BEGIN
        SELECT -3 AS resultado;
        RETURN;
    END

    -- 4. Login correcto
    SELECT 
        1 AS resultado,
        u.id_usuario,
        u.nombre,
        u.apellido,
        r.id_rol,
        r.tipo_rol
    FROM usuarios u
    INNER JOIN roles r ON u.id_rol = r.id_rol
    WHERE u.cedula = @cedula
      AND u.password = @password
      AND u.estado = 1;
END;
GO



-- Listar tipos de identificacion
CREATE PROCEDURE sp_tipo_identificacion_listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        id_tipo_identificacion,
        descripcion
    FROM tipo_identificacion
    ORDER BY descripcion;
END;
GO


-- ***** Procedimiento para pacientes

--Cargar paciente en el DataGridView
create procedure sp_paciente_listar
as
begin
    set nocount on;
    select
    p.id_paciente,
    p.primer_nombre,
    p.segundo_nombre,
    p.primer_apellido,
    p.segundo_apellido,
    ti.descripcion as tipo_identidicacion,
    p.numero_identificacion,
    p.telefono,
    p.fecha_registro,
    p.estado
  from pacientes p
  inner join  tipo_identificacion ti
    on p.id_tipo_identificacion = ti.id_tipo_identificacion
   where p.estado = 1
   order by p.fecha_registro desc;
   end;
   go


--Buscar paciente
CREATE PROCEDURE sp_pacientes_buscar
    @busqueda VARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        p.id_paciente,
        p.primer_nombre,
        p.segundo_nombre,
        p.primer_apellido,
        p.segundo_apellido,
        ti.descripcion AS tipo_identificacion,
        p.numero_identificacion,
        p.telefono,
        p.fecha_registro,
        p.estado
    FROM pacientes p
    INNER JOIN tipo_identificacion ti
        ON p.id_tipo_identificacion = ti.id_tipo_identificacion
    WHERE p.estado = 1
      AND (
            p.primer_nombre LIKE '%' + @busqueda + '%'
         OR p.segundo_nombre LIKE '%' + @busqueda + '%'
         OR p.primer_apellido LIKE '%' + @busqueda + '%'
         OR p.segundo_apellido LIKE '%' + @busqueda + '%'
         OR p.numero_identificacion LIKE '%' + @busqueda + '%'
         OR CAST(p.telefono AS VARCHAR) LIKE '%' + @busqueda + '%'
      )
    ORDER BY p.fecha_registro DESC;
END;
GO

--Guardar un paciente
CREATE PROCEDURE sp_paciente_insertar
    @primer_nombre VARCHAR(50),
    @segundo_nombre VARCHAR(50) = NULL,
    @primer_apellido VARCHAR(50),
    @segundo_apellido VARCHAR(50) = NULL,
    @id_tipo_identificacion INT,
    @numero_identificacion VARCHAR(30),
    @sexo CHAR(1),
    @fecha_nacimiento DATE,
    @ocupacion VARCHAR(100) = NULL,
    @direccion VARCHAR(200) = NULL,
    @telefono INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO pacientes (
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        id_tipo_identificacion,
        numero_identificacion,
        sexo,
        fecha_nacimiento,
        ocupacion,
        direccion,
        telefono
    )
    VALUES (
        @primer_nombre,
        @segundo_nombre,
        @primer_apellido,
        @segundo_apellido,
        @id_tipo_identificacion,
        @numero_identificacion,
        @sexo,
        @fecha_nacimiento,
        @ocupacion,
        @direccion,
        @telefono
    );
END;
GO
