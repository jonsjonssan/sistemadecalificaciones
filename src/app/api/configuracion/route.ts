import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// Obtener configuración del sistema
export async function GET() {
  try {
    let config = await db.configuracionSistema.findFirst();
    
    // Si no existe, crear configuración inicial
    if (!config) {
      config = await db.configuracionSistema.create({
        data: {
          añoEscolar: 2026,
          escuela: 'Centro Escolar'
        }
      });
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

// Actualizar configuración (solo admin)
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');
    
    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }
    
    const usuario = JSON.parse(session.value);
    if (usuario.rol !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden cambiar la configuración.' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { añoEscolar, escuela } = body;
    
    let config = await db.configuracionSistema.findFirst();
    
    if (!config) {
      config = await db.configuracionSistema.create({
        data: {
          añoEscolar: añoEscolar || 2026,
          escuela: escuela || 'Centro Escolar'
        }
      });
    } else {
      config = await db.configuracionSistema.update({
        where: { id: config.id },
        data: {
          ...(añoEscolar !== undefined && { añoEscolar }),
          ...(escuela !== undefined && { escuela })
        }
      });
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
