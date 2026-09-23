# 🏥 Reconocimiento Hospitalario

> Plataforma institucional de gratitud y aprecio entre funcionarios de la salud. Diseñada con una arquitectura **Full Stack Serverless**, control estricto de **1 funcionario = 1 voto**, y panel de administración clínica.

![Reconocimiento Hospitalario Banner](assets/hero-hospital.jpg)

---

## 🌟 Características Principales

- **Muro de Gratitud Público**: Visualización comunitaria y abierta de todos los mensajes de reconocimiento entre equipos de salud con buscador por servicio o cualidad.
- **Autenticación por Padrón (Sin Correo)**: Acceso seguro con **ID de Empleado (RUT o Ficha)** y **Contraseña / PIN Institucional**, evitando correos electrónicos o pasos burocráticos.
- **Control Estricto: 1 Funcionario = 1 Voto**:
  - Control a nivel de base de datos (`PostgreSQL` / `Neon` / `Supabase`) mediante transacción atómica.
  - Validación en endpoint con código HTTP `403 Forbidden` ante intentos duplicados.
  - Interfaz reactiva que bloquea los campos y notifica si el voto ya fue emitido en el ciclo actual.
- **Inclusión de Roles y Cargos Clínicos**:
  - Clasificación por rol: **TENS**, **Kinesiólogo/a**, **Médico/a**, **Enfermero/a**, **Auxiliar**, **Matrón/a**, etc.
- **Panel de Administración (`/admin.html`)**:
  - Acceso restringido con credenciales de administrador (`es_admin: true`).
  - Métricas en tiempo real: tasa de participación electoral, total de funcionarios, votos emitidos vs pendientes.
  - Búsqueda en vivo y filtrado de funcionarios.
  - Alta y baja de personal en el padrón electoral.
  - Botón de **Reinicio de Ciclo** (`ya_voto = false`) para iniciar un nuevo mes o periodo de reconocimiento.

---

## 🏗️ Estructura del Proyecto

```
pagina-seminario/
├── api/                             # Serverless Functions (Vercel)
│   ├── lib/
│   │   ├── db.js                    # Conexión PostgreSQL (Neon/Supabase) y store local
│   │   ├── auth.js                  # Hashing bcrypt y JWT
│   │   └── middleware.js            # Middleware de validación y roles
│   ├── auth/
│   │   ├── login.js                 # POST /api/auth/login
│   │   ├── logout.js                # POST /api/auth/logout
│   │   └── me.js                    # GET /api/auth/me
│   ├── reconocimientos/
│   │   └── index.js                 # GET muro público / POST nuevo reconocimiento
│   └── admin/
│       ├── stats.js                 # GET estadísticas de participación
│       ├── funcionarios.js          # GET / POST / DELETE padrón
│       └── reset-votos.js           # POST reinicio de ciclo
├── assets/
│   └── hero-hospital.jpg            # Imagen principal de hospital moderno
├── db/
│   ├── schema.sql                   # Definición de tablas PostgreSQL
│   └── seed.sql                     # Datos semilla con funcionarios y reconocimientos
├── index.html                       # Página principal con muro, hero y modal de login
├── styles.css                       # Sistema visual y estilos institucionales
├── app.js                           # Lógica del cliente y llamadas a la API
├── admin.html                       # Dashboard de administración hospitalaria
├── admin.css                        # Estilos del panel administrativo
├── admin.js                         # Lógica del panel y gestión del padrón
├── server.js                        # Servidor local Node.js para desarrollo
├── test_flow.js                     # Suite de pruebas automatizadas del flujo de voto
├── vercel.json                      # Configuración de despliegue serverless
├── .env.example                     # Plantilla de variables de entorno
└── .gitignore                       # Exclusiones de control de versiones
```

---

## 🚀 Instalación y Ejecución Local

### 1. Requisitos Previos
- [Node.js](https://nodejs.org/) v18 o superior.
- Git.

### 2. Clonar el Repositorio
```bash
git clone https://github.com/saludxtecnologica-lang/paginaseminario.git
cd paginaseminario
```

### 3. Instalar Dependencias
```bash
npm install
```

### 4. Iniciar Servidor de Desarrollo
```bash
npm start
```
La aplicación estará disponible en:
- **Sitio Principal**: [http://localhost:8086/](http://localhost:8086/)
- **Panel Administrador**: [http://localhost:8086/admin.html](http://localhost:8086/admin.html)

---

## 🧪 Pruebas Automatizadas

Para validar todo el flujo de autenticación, control de 1 voto por funcionario, bloqueo de duplicados y reinicio de ciclo:

```bash
npm test
```

---

## ☁️ Despliegue en Vercel con Base de Datos

1. Importar el repositorio en [Vercel](https://vercel.com).
2. Crear una base de datos gratuita en [Neon](https://neon.tech) o [Supabase](https://supabase.com).
3. En la consola SQL de tu base de datos, ejecutar:
   - `db/schema.sql`
   - `db/seed.sql`
4. En Vercel (**Settings > Environment Variables**), configurar:
   - `DATABASE_URL`: URL de conexión a PostgreSQL.
   - `JWT_SECRET`: Llave secreta alfanumérica para la firma de tokens.
5. ¡Listo! Vercel desplegará automáticamente la aplicación y las Serverless Functions.

---

## 👥 Credenciales de Demostración Rápida

| Funcionario | ID / RUT | PIN | Rol / Cargo | Estado de Voto |
|---|---|---|---|---|
| **Dra. Natalia Gómez** | `admin` | `1234` | Administradora / Jefa de Servicio | Acceso a `/admin.html` |
| **Dr. Andrés Gómez** | `11111111-1` | `1234` | Médico Urgenciólogo | Habilitado para votar |
| **Matr. Camila Soto** | `44444444-4` | `1234` | Matrona Clínica | Ya emitió su voto |

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
