create database MediTech
go

use MediTech
go


/* Meditech

Roles disponibles: Administrador, Doctor/Especialista , Asistente, caja y paciente

Modulos: Modulos usuario, Modulo pacientes, Citas, Historia clinica, tratamientos, Consentimiento Informado, modulo de caja y pagos, reportes, Configuraci[on
*/
Create table roles( 
    id_rol int identity(1,1) primary key,
    tipo_rol varchar(30) not null unique
);
create table modulos(
    id_modulo int identity(1,1) primary key,
    modulo varchar(30) not null unique
);

create table rol_modulo(
     id_rol int not null,
     id_modulo int not null,

     constraint pk_rol_modulo primary key (id_rol, id_modulo),
     constraint fk_rm_rol foreign key (id_rol) references roles(id_rol),
     CONSTRAINT fk_rm_modulo FOREIGN KEY (id_modulo) REFERENCES modulos(id_modulo)
);

CREATE TABLE usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    cedula VARCHAR(30) NOT NULL UNIQUE,   -- será el usuario
    password VARCHAR(255) NOT NULL,       -- hash, no texto plano
    email VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(15),
    id_rol INT NOT NULL,
    estado BIT NOT NULL DEFAULT 1,         -- 1 activo, 0 inactivo
    fecha_creacion DATETIME DEFAULT GETDATE(),

    CONSTRAINT fk_usuario_rol
        FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);








/*Insercion de datos*/

insert into roles (tipo_rol) values
('Administrador'),
('Doctor'),
('Asistente'),
('Caja'),
('Paciente');

select * from roles

select * from modulos;

select * from rol_modulo;



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

SELECT * FROM usuarios;
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



/*Procedimiento de almacenado*/

-- funcionalidad: validar usuario para inicio de sesión
create procedure login_usuario
    @cedula varchar(30),
    @password varchar(255)
   as
   begin
    
select 
    u.id_usuario,
    u.nombre,
    u.apellido,
    u.cedula,
    r.id_rol,
    r.tipo_rol

    from usuarios u 
    inner join roles r on u.id_rol = r.id_rol
    where u.cedula = @cedula
        and u.password = @password
        and u.estado = 1;
    end;
    go

