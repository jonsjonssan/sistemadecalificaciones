# Sistema de Calificaciones Escolar

Sistema de gestión de calificaciones para centros escolares, desarrollado con Next.js 16, Prisma y PostgreSQL.

## Características Principales

- **Gestión de Usuarios**: Administradores y docentes con roles diferenciados
- **Gestión de Grados**: Soporte para grados 2do a 9no con secciones múltiples
- **Gestión de Estudiantes**: Registro completo con número de lista
- **Gestión de Materias**: Materias por grado con configuración de actividades
- **Calificaciones**: Sistema de calificaciones por trimestre con:
  - Actividades Cotidianas
  - Actividades Integradoras
  - Exámenes Trimestrales
  - Sistema de Recuperación
- **Asistencia**: Registro diario de asistencia por estudiante
- **Reportes**: Generación de boletas de calificaciones
- **Dashboard**: Estadísticas y métricas del sistema

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **Estado**: Zustand, React Query (TanStack Query)
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Autenticación**: NextAuth.js
- **Validación**: Zod
- **Gráficos**: Recharts
- **Theming**: next-themes (modo oscuro)

## Requisitos Previos

- Node.js 18+ (recomendado: 20 LTS)
- PostgreSQL 14+ o Neon (PostgreSQL en la nube)
- npm, yarn, pnpm o bun

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd sistemadecalificaciones
```

### 2. Instalar dependencias

```bash
npm install
# o con bun
bun install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos (Neon PostgreSQL)
DATABASE_URL="postgresql://usuario:password@host:5432/dbname?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-aqui-minimo-32-caracteres"

# Opcional: Sentry para error tracking
SENTRY_DSN=""
```

Para obtener una URL de PostgreSQL gratuita, regístrate en [Neon](https://neon.tech).

### 4. Inicializar la base de datos

```bash
# Generar cliente Prisma
npm run db:generate

# Aplicar migraciones (crear tablas)
npm run db:push
```

### 5. Inicializar datos de prueba

```bash
# La primera vez que accedas al sistema, visita:
# http://localhost:3000/api/init
# Esto creará el usuario administrador inicial
```

**Credenciales por defecto:**
- Email: `admin@escuela.edu`
- Contraseña: `admin123` (cambiar inmediatamente)

## Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo en puerto 3000

# Build y producción
npm run build        # Construir aplicación para producción
npm run start        # Iniciar servidor de producción

# Base de datos
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Sincronizar schema con DB
npm run db:migrate   # Crear migración
npm run db:reset     # Resetear base de datos

# Calidad de código
npm run lint         # Ejecutar ESLint
```

## Estructura del Proyecto

```
sistemadecalificaciones/
├── prisma/
│   └── schema.prisma          # Schema de la base de datos
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # Autenticación
│   │   │   ├── usuarios/      # Gestión de usuarios
│   │   │   ├── grados/        # Gestión de grados
│   │   │   ├── estudiantes/   # Gestión de estudiantes
│   │   │   ├── materias/     # Gestión de materias
│   │   │   ├── calificaciones/ # Gestión de calificaciones
│   │   │   ├── asistencia/    # Gestión de asistencia
│   │   │   └── stats/        # Estadísticas
│   │   ├── layout.tsx        # Layout principal
│   │   └── page.tsx          # Página principal
│   ├── components/            # Componentes React
│   │   ├── ui/               # Componentes base (shadcn/ui)
│   │   ├── Dashboard.tsx     # Dashboard principal
│   │   └── AsistenciaBoard.tsx # Tablero de asistencia
│   ├── hooks/                # Custom hooks
│   └── lib/                  # Utilidades y configuración
│       ├── prisma.ts         # Cliente Prisma
│       ├── validations.ts    # Esquemas Zod
│       └── utils.ts          # Funciones auxiliares
├── public/                   # Archivos estáticos
├── tailwind.config.ts       # Configuración de Tailwind
├── next.config.ts           # Configuración de Next.js
└── package.json
```

## Modelo de Datos

### Entidades Principales

- **Usuario**: Administradores y docentes del sistema
- **Grado**: Cursos del 2do al 9no grado
- **Estudiante**: Alumnos registrados en el sistema
- **Materia**: Asignaturas por grado
- **Calificacion**: Notas por estudiante, materia y trimestre
- **Asistencia**: Registro diario de asistencia
- **ConfigActividad**: Configuración de actividades por materia
- **DocenteMateria**: Asignación de docentes a materias

## API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### Usuarios
- `GET /api/usuarios` - Listar usuarios
- `POST /api/usuarios` - Crear usuario
- `PUT /api/usuarios` - Actualizar usuario
- `DELETE /api/usuarios` - Eliminar usuario

### Grados
- `GET /api/grados` - Listar grados
- `POST /api/grados` - Crear grado
- `PUT /api/grados` - Actualizar grado
- `DELETE /api/grados` - Eliminar grado

### Estudiantes
- `GET /api/estudiantes` - Listar estudiantes
- `POST /api/estudiantes` - Crear estudiante
- `PUT /api/estudiantes` - Actualizar estudiante
- `DELETE /api/estudiantes` - Eliminar estudiante

### Materias
- `GET /api/materias` - Listar materias
- `POST /api/materias` - Crear materia
- `PUT /api/materias` - Actualizar materia
- `DELETE /api/materias` - Eliminar materia

### Calificaciones
- `GET /api/calificaciones` - Listar calificaciones
- `POST /api/calificaciones` - Crear/actualizar calificación
- `GET /api/boleta` - Generar boleta de calificaciones

### Asistencia
- `GET /api/asistencia` - Listar asistencia
- `POST /api/asistencia` - Registrar asistencia
- `GET /api/asistencia/resumen` - Resumen de asistencia

### Estadísticas
- `GET /api/stats/dashboard` - Estadísticas del dashboard

## Sistema de Calificaciones

### Estructura de Trimestre

Cada trimestre tiene:
1. **Actividades Cotidianas** (35%): Evaluaciones frecuentes
2. **Actividades Integradoras** (35%): Proyectos y evaluaciones mayores
3. **Examen Trimestral** (30%): Evaluación final del trimestre

### Cálculo de Promedio

```
Promedio AC = sum(actividadesCotidianas) / cantidad
Promedio AI = sum(actividadesIntegradoras) / cantidad
Promedio Final = (Promedio AC * 0.35) + (Promedio AI * 0.35) + (Examen * 0.30)
```

### Recuperación

Si el promedio final es menor a 6.0, el estudiante puede presentar recuperación.
La nota de recuperación reemplaza el promedio final si es mayor.

## Desarrollo

### Agregar nuevos endpoints API

1. Crear el archivo en `src/app/api/<recurso>/route.ts`
2. Usar el cliente Prisma desde `@/lib/prisma`
3. Implementar validaciones con Zod
4. Manejar errores apropiadamente

### Agregar componentes UI

Los componentes base están en `src/components/ui/`. Para agregar nuevos:

```bash
npx shadcn@latest add <componente>
```

## Despliegue

### Vercel (Recomendado)

1. Conectar tu repositorio a Vercel
2. Configurar las variables de entorno
3. Deploy automático en cada push

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contribución

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcion`)
3. Commit tus cambios (`git commit -am 'Agregar nueva función'`)
4. Push a la rama (`git push origin feature/nueva-funcion`)
5. Crea un Pull Request

## Licencia

MIT License - Ver archivo LICENSE para más detalles.

## Soporte

Para reportar bugs o solicitar funcionalidades, crea un issue en el repositorio.
