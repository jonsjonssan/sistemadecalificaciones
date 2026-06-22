"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, Lock, Users, Eye, Server, Baby, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs sm:text-sm text-muted-foreground hover:text-primary underline-offset-2 hover:underline transition-colors"
      >
        Políticas de Privacidad
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-card border border-border shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display text-base sm:text-lg font-bold text-foreground">
                      Políticas de Privacidad
                    </h2>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      Protección de datos personales y de menores de edad
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 rounded-full"
                  aria-label="Cerrar políticas de privacidad"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="overflow-y-auto p-5 sm:p-6 space-y-6 text-sm text-foreground leading-relaxed">
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-bold">1. Alcance y compromiso</h3>
                  </div>
                  <p className="text-muted-foreground">
                    El <strong>Sistema Integral de Gestión Académica y Calificaciones (SIGAS)</strong>{" "}
                    se compromete a proteger la información personal de sus usuarios —docentes,
                    administradores, estudiantes y representantes— conforme a la legislación aplicable
                    en El Salvador y los estándares internacionales vigentes en materia de protección
                    de datos personales.
                  </p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-bold">2. Datos que recolectamos</h3>
                  </div>
                  <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                    <li>
                      <strong>Datos de identificación:</strong> nombre completo, correo electrónico
                      institucional, rol educativo y escuela o centro escolar de adscripción.
                    </li>
                    <li>
                      <strong>Datos académicos:</strong> calificaciones, asistencia, observaciones
                      conductuales, asignaturas, grados, secciones y reportes de desempeño.
                    </li>
                    <li>
                      <strong>Datos de menores de edad:</strong> nombre del estudiante, información
                      de contacto del representante legal y registros académicos y conductuales.
                    </li>
                    <li>
                      <strong>Datos técnicos:</strong> dirección IP, navegador, sesiones de acceso y
                      registros de auditoría con fines de seguridad.
                    </li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-bold">3. Finalidad del tratamiento</h3>
                  </div>
                  <p className="text-muted-foreground">
                    La información se utiliza exclusivamente para fines educativos, administrativos
                    institucionales y de seguridad: gestión de calificaciones, generación de boletas,
                    seguimiento académico, control de asistencia, comunicación con representantes legales
                    y auditoría de accesos. No se comercializan datos personales ni se comparten con
                    terceros ajenos a la institución educativa sin consentimiento fundamentado.
                  </p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-bold">
                      4. Protección de datos de menores de edad
                    </h3>
                  </div>
                  <p className="text-muted-foreground">
                    De conformidad con la{" "}
                    <em>Ley de Protección Integral de la Niñez y la Adolescencia (LEPINA)</em>, decreto
                    N° 716 de El Salvador, el <em>Código de Familia</em> y la{" "}
                    <em>Convención sobre los Derechos del Niño</em> de las Naciones Unidas, los datos de
                    estudiantes menores de edad reciben un tratamiento especial de protección:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                    <li>
                      Solo el personal autorizado de la institución educativa puede acceder a los
                      registros de menores.
                    </li>
                    <li>
                      La información académica y conductual se comparte únicamente con los representantes
                      legales o tutores del estudiante.
                    </li>
                    <li>
                      Se aplica el principio de minimización de datos: solo se recopila la información
                      estrictamente necesaria para el proceso educativo.
                    </li>
                    <li>
                      Los datos se conservan durante el tiempo indispensable y se eliminan de forma segura
                      cuando ya no son necesarios.
                    </li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-bold">5. Seguridad de la información</h3>
                  </div>
                  <p className="text-muted-foreground">
                    Implementamos medidas técnicas y administrativas para resguardar la información:
                    sesiones mediante cookies seguras y <em>httpOnly</em>, conexiones cifradas (HTTPS),
                    registros de auditoría de accesos, control de roles y permisos, y copias de seguridad
                    periódicas. El acceso a datos sensibles está restringido según el perfil del usuario.
                  </p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-base font-bold">
                      6. Marco legal e internacional
                    </h3>
                  </div>
                  <p className="text-muted-foreground">
                    Esta política se fundamenta en las siguientes normas y principios:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                    <li>
                      <strong>El Salvador:</strong> Constitución Política de la República (derecho a la
                      intimidad personal y familiar), Ley de Acceso a la Información Pública (Decreto
                      Legislativo N° 534), LEPINA (Decreto N° 716) y Código de Familia.
                    </li>
                    <li>
                      <strong>Internacional:</strong> Reglamento General de Protección de Datos (GDPR) de
                      la Unión Europea, Principios de la OCDE sobre Protección de Datos y la Convención
                      sobre los Derechos del Niño de la ONU.
                    </li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="font-display text-base font-bold">7. Derechos de los titulares</h3>
                  <p className="text-muted-foreground">
                    Los titulares de datos y los representantes legales de menores pueden ejercer los
                    derechos de acceso, rectificación, cancelación y oposición respecto a la información
                    personal tratada en el sistema, presentando su solicitud ante la administración de la
                    institución educativa correspondiente.
                  </p>
                </section>

                <section className="space-y-3">
                  <h3 className="font-display text-base font-bold">8. Contacto</h3>
                  <p className="text-muted-foreground">
                    Para consultas sobre esta política o para ejercer sus derechos, comuníquese con la
                    dirección o el departamento técnico de su centro escolar.
                  </p>
                </section>

                <p className="text-xs text-muted-foreground/70 pt-2">
                  Última actualización: {new Date().getFullYear()}.
                </p>
              </div>

              <div className="border-t border-border p-4 flex justify-end bg-muted/30">
                <Button size="sm" onClick={() => setOpen(false)} className="bg-primary">
                  Entendido
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
