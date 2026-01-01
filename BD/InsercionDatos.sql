--INSERCION DE DATOS

use MediTech
go




insert into roles (tipo_rol) values
('Administrador'),
('Doctor'),
('Asistente'),
('Caja'),
('Paciente');

insert into modulos (modulo) values
('Usuarios'),
('Pacientes'),
('Citas'),
('Historia Clinica'),
('Tratamientos'),
('Consentimientos'),
('Caja'),
('Reportes'),
('Configuración');

INSERT INTO rol_modulo (id_rol, id_modulo) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),
(2,2),(2,3),(2,4),(2,5),(2,6),
(3,2),(3,3),(3,5),
(4,2),(4,7),(4,8),
(5,4),(5,6);

INSERT INTO usuarios (
    nombre,
    apellido,
    cedula,
    password,
    email,
    telefono,
    id_rol
)
VALUES (
    'Administrador',
    'General',
    '0000000000',          -- cédula = usuario
    'admin123',            -- ⚠️ temporal (luego usar hash desde C#)
    'admin@meditech.com',
    '0000000000',
    1                       -- id_rol = Administrador
);

INSERT INTO tipo_identificacion (descripcion)
VALUES
('Cédula'),
('Pasaporte'),
('Otro');

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
VALUES
-- Paciente 1 (cédula, 2 nombres, 2 apellidos)
( 'María','José','Pérez','López',1,'001-120595-0001A','F','1995-05-12','Docente','Managua, Nicaragua',88887777),

-- Paciente 2 (cédula, 1 nombre, 1 apellido)
('Carlos',NULL,'Gómez',NULL,1,'002-150890-0002B','M','1990-08-15','Ingeniero','León, Nicaragua',77776666),

-- Paciente 3 (pasaporte)
('Ana','Lucía','Martínez',NULL,2,'P12345678','F','1988-03-22','Diseñadora','Granada, Nicaragua',89998888),

-- Paciente 4 (otro tipo de identificación)
('José',NULL,'Ramírez','Castillo',3,'TEMP-00045','M','1975-11-30','Comerciante','Masaya, Nicaragua',86665555),

-- Paciente 5 (cédula)
('Laura','Elena','Hernández','Ruiz',1,'003-220200-0003C','F','2000-02-22','Estudiante','Chinandega, Nicaragua',85554444);


/* --- algunos select para ver detalles de las tablas.
*/

--Ver usuario + rol
SELECT 
    u.id_usuario,
    u.nombre,
    u.apellido,
    u.cedula,
    r.tipo_rol,
    u.estado
FROM usuarios u
INNER JOIN roles r ON u.id_rol = r.id_rol;

SELECT 
    r.tipo_rol,
    m.modulo
FROM rol_modulo rm
INNER JOIN roles r ON rm.id_rol = r.id_rol
INNER JOIN modulos m ON rm.id_modulo = m.id_modulo
ORDER BY r.id_rol, m.id_modulo;


select * from roles

select * from modulos;

select * from rol_modulo;
