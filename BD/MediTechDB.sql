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

create table tipo_identificacion(
    id_tipo_identificacion int identity (1,1) primary key,
    descripcion varchar(30) not null
);

CREATE TABLE pacientes (
    id_paciente INT IDENTITY(1,1) PRIMARY KEY,
    primer_nombre VARCHAR(50) NOT NULL,
    segundo_nombre VARCHAR(50) NULL,     -- Nombres (segundos opcionales)
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50) NULL, -- Apellidos (segundo opcional)
    id_tipo_identificacion INT NOT NULL, -- Identificación
    numero_identificacion VARCHAR(30) NOT NULL,
    sexo CHAR(1) NOT NULL 
        CHECK (sexo IN ('M','F')),
    fecha_nacimiento DATE NOT NULL,
    ocupacion VARCHAR(100),
    direccion VARCHAR(200),
    telefono INT,

    -- Control del sistema
    fecha_registro DATETIME NOT NULL DEFAULT GETDATE(),
    estado BIT NOT NULL DEFAULT 1,

    CONSTRAINT uq_identificacion UNIQUE (id_tipo_identificacion, numero_identificacion),

    CONSTRAINT fk_paciente_tipo_identificacion
        FOREIGN KEY (id_tipo_identificacion)
        REFERENCES tipo_identificacion(id_tipo_identificacion)
);





