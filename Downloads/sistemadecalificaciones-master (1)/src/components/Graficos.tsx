"use client";

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface CalificacionData {
  materia: string;
  trimestre1: number;
  trimestre2: number;
  trimestre3: number;
  promedio: number;
}

interface AsistenciaData {
  nombre: string;
  presentes: number;
  ausentes: number;
  justificadas: number;
  tardanzas: number;
}

interface PromedioMateriaData {
  nombre: string;
  promedio: number;
  estudiantes: number;
}

interface EvolucionData {
  mes: string;
  promedioGeneral: number;
  asistencia: number;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

interface ChartsProps {
  calificaciones?: CalificacionData[];
  asistencia?: AsistenciaData[];
  promediosMaterias?: PromedioMateriaData[];
  evolucion?: EvolucionData[];
}

export function GraficoLineasCalificaciones({ calificaciones }: { calificaciones: CalificacionData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={calificaciones} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="materia" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "hsl(var(--card))", 
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem"
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="trimestre1" name="Trim. 1" stroke="#3b82f6" strokeWidth={2} />
        <Line type="monotone" dataKey="trimestre2" name="Trim. 2" stroke="#10b981" strokeWidth={2} />
        <Line type="monotone" dataKey="trimestre3" name="Trim. 3" stroke="#f59e0b" strokeWidth={2} />
        <Line type="monotone" dataKey="promedio" name="Promedio" stroke="#8b5cf6" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GraficoBarrasPromedios({ promediosMaterias }: { promediosMaterias: PromedioMateriaData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={promediosMaterias} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "hsl(var(--card))", 
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem"
          }}
        />
        <Legend />
        <Bar dataKey="promedio" name="Promedio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoTortaAsistencia({ asistencia }: { asistencia: AsistenciaData[] }) {
  const totalData = asistencia.reduce((acc, curr) => ({
    presentes: acc.presentes + curr.presentes,
    ausentes: acc.ausentes + curr.ausentes,
    justificadas: acc.justificadas + curr.justificadas,
    tardanzas: acc.tardanzas + curr.tardanzas,
  }), { presentes: 0, ausentes: 0, justificadas: 0, tardanzas: 0 });

  const pieData = [
    { name: "Presentes", value: totalData.presentes },
    { name: "Ausentes", value: totalData.ausentes },
    { name: "Justificadas", value: totalData.justificadas },
    { name: "Tardanzas", value: totalData.tardanzas },
  ].filter(d => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "hsl(var(--card))", 
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem"
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GraficoEvolucion({ evolucion }: { evolucion: EvolucionData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={evolucion} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" domain={[0, 10]} tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "hsl(var(--card))", 
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem"
          }}
        />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="promedioGeneral" name="Promedio General" stroke="#3b82f6" strokeWidth={2} />
        <Line yAxisId="right" type="monotone" dataKey="asistencia" name="Asistencia %" stroke="#10b981" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GraficoBarrasAgrupadas({ asistencia }: { asistencia: AsistenciaData[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={asistencia.slice(0, 10)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="nombre" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "hsl(var(--card))", 
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem"
          }}
        />
        <Legend />
        <Bar dataKey="presentes" name="Presentes" fill="#10b981" stackId="a" />
        <Bar dataKey="ausentes" name="Ausentes" fill="#ef4444" stackId="a" />
        <Bar dataKey="justificadas" name="Justificadas" fill="#f59e0b" stackId="a" />
        <Bar dataKey="tardanzas" name="Tardanzas" fill="#8b5cf6" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
