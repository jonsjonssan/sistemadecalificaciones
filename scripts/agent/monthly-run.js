#!/usr/bin/env node

/**
 * Script de ejecución mensual del Agente Monitor
 * 
 * Este script ejecuta el análisis de riesgo estudiantil de forma automática.
 * Se recomienda programarlo para ejecutarse el primer día de cada mes.
 * 
 * Uso:
 *   npm run agent:monthly
 * 
 * Programación en Windows (Task Scheduler):
 *   schtasks /create /tn "AgenteMonitor" /tr "node scripts/agent/monthly-run.js" /sc monthly /d 1 /st 06:00
 * 
 * Programación en Linux/Mac (cron):
 *   0 6 1 * * cd /path/to/project && node scripts/agent/monthly-run.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const ESCUELA_ID = process.env.AGENT_ESCUELA_ID || "";
const AGENT_TOKEN = process.env.AGENT_SECRET_TOKEN;

if (!AGENT_TOKEN || AGENT_TOKEN.length < 16) {
  console.error("❌ AGENT_SECRET_TOKEN no configurado o demasiado corto (mínimo 16 caracteres).");
  console.error("   Genere uno con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"");
  process.exit(1);
}

if (!ESCUELA_ID) {
  console.error("❌ AGENT_ESCUELA_ID no configurado. Establezca la variable de entorno con el ID de la escuela a analizar.");
  process.exit(1);
}

async function ejecutarAgenteMensual() {
  console.log("🤖 Agente Monitor - Ejecución Mensual");
  console.log("======================================");
  console.log(` 📅 Fecha: ${new Date().toLocaleString("es-DO")}`);
  console.log(`🌐 URL: ${BASE_URL}`);
  console.log(`🏫 Escuela ID: ${ESCUELA_ID}`);
  console.log("");

  try {
    const response = await fetch(`${BASE_URL}/api/agent/monitor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AGENT_TOKEN}`,
      },
      body: JSON.stringify({
        año: new Date().getFullYear(),
        guardarAlertas: true,
        escuelaId: ESCUELA_ID,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Error: ${response.status} - ${error}`);
      process.exit(1);
    }

    const resultado = await response.json();

    console.log("✅ Análisis completado exitosamente");
    console.log(`⏱️  Duración: ${resultado.duracionMs}ms`);
    console.log(`📊 Estudiantes analizados: ${resultado.resumen.totalAnalizados}`);
    console.log(`🚨 Alertas generadas: ${resultado.resumen.riesgoAlto + resultado.resumen.riesgoMedio + resultado.resumen.bajoRendimiento + resultado.resumen.asistenciaCritica}`);
    console.log("");
    console.log("📋 Resumen:");
    console.log(`   • Riesgo Alto: ${resultado.resumen.riesgoAlto}`);
    console.log(`   • Riesgo Medio: ${resultado.resumen.riesgoMedio}`);
    console.log(`   • Bajo Rendimiento: ${resultado.resumen.bajoRendimiento}`);
    console.log(`   • Asistencia Crítica: ${resultado.resumen.asistenciaCritica}`);
    console.log("");

    if (resultado.estudiantesEnRiesgo.length > 0) {
      console.log("⚠️  Top 5 estudiantes en mayor riesgo:");
      resultado.estudiantesEnRiesgo.slice(0, 5).forEach((est: any, i: number) => {
        console.log(`   ${i + 1}. ${est.nombre} (${est.gradoNumero}°${est.gradoSeccion}) - Riesgo: ${(est.puntajeRiesgo * 100).toFixed(0)}%`);
      });
      console.log("");
    }

    console.log("🔔 Las alertas están disponibles en el Dashboard del sistema.");
    console.log("======================================");
    console.log("✅ Ejecución mensual completada");

  } catch (error) {
    console.error("❌ Error al ejecutar el agente:");
    console.error(error);
    process.exit(1);
  }
}

ejecutarAgenteMensual();
