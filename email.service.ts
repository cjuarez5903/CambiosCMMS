import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const smtpConfig = {
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<boolean>('SMTP_SECURE') === true,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASSWORD'),
      },
      tls: {
        rejectUnauthorized: false,
      },
      // Configuraciones de timeout y reintentos
      connectionTimeout: 5000, // 5 segundos
      greetingTimeout: 5000,   // 5 segundos
      socketTimeout: 10000,    // 10 segundos
    };

    this.transporter = nodemailer.createTransport(smtpConfig);

    // Verificar conexión (sin bloquear el arranque)
    this.transporter.verify((error) => {
      if (error) {
        console.error('⚠️  Error en la configuración de email:', error.message);
        console.warn('⚠️  El sistema funcionará sin notificaciones por email');
      } else {
        console.log('✅ Servidor de email listo para enviar correos');
      }
    });
  }

  async enviarNotificacionCambioEstado(
    ordenNumero: string,
    estadoAnterior: string,
    estadoNuevo: string,
    emailSolicitante: string,
    sucursal: string,
    titulo: string,
  ): Promise<void> {
    const ingenieroRegionalEmail = this.configService.get<string>('INGENIERO_REGIONAL_EMAIL');
    const emailFrom = this.configService.get<string>('EMAIL_FROM');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    // Timeout absoluto para todo el proceso de envío de emails
    const TIMEOUT_MS = 8000; // 8 segundos máximo para todo

    const asunto = `Cambio de Estado - OT ${ordenNumero}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .header {
            background-color: #1e3a8a;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 5px 5px;
          }
          .info-box {
            background-color: #f0f4ff;
            padding: 15px;
            border-left: 4px solid #1e3a8a;
            margin: 20px 0;
          }
          .info-row {
            margin: 10px 0;
          }
          .label {
            font-weight: bold;
            color: #1e3a8a;
          }
          .estado-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 3px;
            font-weight: bold;
            margin: 0 5px;
          }
          .estado-pendiente {
            background-color: #fef3c7;
            color: #92400e;
          }
          .estado-asignada {
            background-color: #dbeafe;
            color: #1e40af;
          }
          .estado-en_progreso {
            background-color: #fed7aa;
            color: #9a3412;
          }
          .estado-completada {
            background-color: #d1fae5;
            color: #065f46;
          }
          .estado-cancelada {
            background-color: #fee2e2;
            color: #991b1b;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #f97316;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Cambio de Estado de Orden de Trabajo</h1>
          </div>
          <div class="content">
            <p>Se ha registrado un cambio de estado en la siguiente orden de trabajo:</p>

            <div class="info-box">
              <div class="info-row">
                <span class="label">Número de Orden:</span> ${ordenNumero}
              </div>
              <div class="info-row">
                <span class="label">Título:</span> ${titulo}
              </div>
              <div class="info-row">
                <span class="label">Sucursal:</span> ${sucursal}
              </div>
              <div class="info-row">
                <span class="label">Estado Anterior:</span>
                <span class="estado-badge estado-${estadoAnterior.toLowerCase()}">${this.formatearEstado(estadoAnterior)}</span>
              </div>
              <div class="info-row">
                <span class="label">Estado Actual:</span>
                <span class="estado-badge estado-${estadoNuevo.toLowerCase()}">${this.formatearEstado(estadoNuevo)}</span>
              </div>
            </div>

            <p>Puedes ver los detalles completos de la orden de trabajo accediendo al sistema:</p>

            <center>
              <a href="${frontendUrl}/#/work-orders" class="btn">Ver Órdenes de Trabajo</a>
            </center>

            <div class="footer">
              <p>Este es un correo automático del Sistema CMMS de Mr. B Storage.</p>
              <p>Por favor no responder a este correo.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Helper function: Promise con timeout
    const enviarConTimeout = async (mailOptions: any, destinatario: string): Promise<void> => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Email timeout')), TIMEOUT_MS);
      });

      try {
        await Promise.race([
          this.transporter.sendMail(mailOptions),
          timeoutPromise
        ]);
        console.log(`📧 Email enviado exitosamente a: ${destinatario}`);
      } catch (error) {
        const errorMsg = error.message || String(error);
        console.error(`❌ Error enviando email a ${destinatario}:`, errorMsg);
        // No lanzar error - fire-and-forget
      }
    };

    // Enviar emails en paralelo con timeout
    const promesas: Promise<void>[] = [];

    // Procesar emails del ingeniero regional (soporta múltiples emails separados por coma o punto y coma)
    if (ingenieroRegionalEmail) {
      // Dividir por coma o punto y coma y filtrar emails vacíos
      const emails = ingenieroRegionalEmail
        .split(/[,;]/)
        .map(e => e.trim())
        .filter(e => e.length > 0);
      
      for (const email of emails) {
        promesas.push(
          enviarConTimeout({
            from: emailFrom,
            to: email,
            subject: asunto,
            html: htmlContent,
          }, `ingeniero regional: ${email}`)
        );
      }
    }

    // Enviar al usuario solicitante
    if (emailSolicitante) {
      promesas.push(
        enviarConTimeout({
          from: emailFrom,
          to: emailSolicitante,
          subject: asunto,
          html: htmlContent,
        }, `solicitante: ${emailSolicitante}`)
      );
    }

    // Ejecutar todos los envíos en paralelo sin bloquear
    // Si falla alguno, no afecta al resto
    await Promise.allSettled(promesas);
  }

  async enviarNuevaOrdenTrabajo(
    ordenNumero: string,
    titulo: string,
    descripcion: string,
    sucursalNombre: string,
    paisNombre: string,
    destinatarios: string[],
    creadoPorNombre: string,
  ): Promise<void> {
    const emailFrom = this.configService.get<string>('EMAIL_FROM');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const TIMEOUT_MS = 8000;

    const destinatariosValidos = destinatarios.filter(e => e && e.trim().length > 0);
    if (destinatariosValidos.length === 0) return;

    const asunto = `Nueva Orden de Trabajo Registrada - ${ordenNumero}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
          .header { background-color: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 5px 5px; }
          .info-box { background-color: #f0f4ff; padding: 15px; border-left: 4px solid #f97316; margin: 20px 0; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; color: #1e3a8a; }
          .badge { display: inline-block; padding: 5px 12px; border-radius: 3px; font-weight: bold; background-color: #fef3c7; color: #92400e; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Nueva Orden de Trabajo Registrada</h1>
          </div>
          <div class="content">
            <p>Se ha registrado una nueva orden de trabajo en su país <strong>${paisNombre}</strong>.</p>
            <div class="info-box">
              <div class="info-row"><span class="label">Número de Orden:</span> ${ordenNumero}</div>
              <div class="info-row"><span class="label">Título:</span> ${titulo}</div>
              <div class="info-row"><span class="label">Descripción:</span> ${descripcion || 'Sin descripción'}</div>
              <div class="info-row"><span class="label">Sucursal:</span> ${sucursalNombre}</div>
              <div class="info-row"><span class="label">País:</span> ${paisNombre}</div>
              <div class="info-row"><span class="label">Registrada por:</span> ${creadoPorNombre}</div>
              <div class="info-row"><span class="label">Estado:</span> <span class="badge">PENDIENTE</span></div>
            </div>
            <center>
              <a href="${frontendUrl}/#/work-orders" class="btn">Ver Órdenes de Trabajo</a>
            </center>
            <div class="footer">
              <p>Este es un correo automático del Sistema CMMS de Mr. B Storage.</p>
              <p>Por favor no responder a este correo.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const enviarConTimeout = async (mailOptions: any, destinatario: string): Promise<void> => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Email timeout')), TIMEOUT_MS);
      });
      try {
        await Promise.race([this.transporter.sendMail(mailOptions), timeoutPromise]);
        console.log(`📧 Email enviado exitosamente a: ${destinatario}`);
      } catch (error) {
        console.error(`❌ Error enviando email a ${destinatario}:`, error.message || String(error));
      }
    };

    const promesas = destinatariosValidos.map(email =>
      enviarConTimeout({
        from: emailFrom,
        to: email.trim(),
        subject: asunto,
        html: htmlContent,
      }, email.trim())
    );

    await Promise.allSettled(promesas);
  }

  async enviarAlertaConsumoPlanta(datos: {
    sucursalNombre: string;
    fechaRegistro: string;
    lecturaAnteriorM3: number;
    lecturaActualM3: number;
    consumoDiarioM3: number;
    caudalDisenoM3dia: number;
    destinatarios: string[];
  }): Promise<void> {
    const emailFrom = this.configService.get<string>('EMAIL_FROM');
    const TIMEOUT_MS = 8000;

    const porcentaje = datos.caudalDisenoM3dia > 0
      ? ((datos.consumoDiarioM3 / datos.caudalDisenoM3dia) * 100).toFixed(1)
      : 'N/A';

    const asunto = `🚨 ALERTA: Sobreconsumo de Agua - ${datos.sucursalNombre}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
          .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: white; padding: 30px; border-radius: 0 0 5px 5px; }
          .alert-box { background-color: #fee2e2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0; border-radius: 3px; }
          .info-box { background-color: #f0f4ff; padding: 15px; border-left: 4px solid #1e3a8a; margin: 20px 0; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; color: #1e3a8a; }
          .valor-alerta { font-size: 1.3em; font-weight: bold; color: #dc2626; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 ALERTA DE SOBRECONSUMO</h1>
            <p>Planta de Tratamiento de Agua</p>
          </div>
          <div class="content">
            <div class="alert-box">
              <strong>Se ha detectado un consumo diario que supera el caudal de diseño configurado.</strong>
            </div>
            <div class="info-box">
              <div class="info-row"><span class="label">Sucursal:</span> ${datos.sucursalNombre}</div>
              <div class="info-row"><span class="label">Fecha del Registro:</span> ${datos.fechaRegistro}</div>
              <div class="info-row"><span class="label">Lectura Anterior:</span> ${datos.lecturaAnteriorM3.toFixed(3)} m³</div>
              <div class="info-row"><span class="label">Lectura Actual:</span> ${datos.lecturaActualM3.toFixed(3)} m³</div>
              <div class="info-row">
                <span class="label">Consumo Diario Calculado:</span>
                <span class="valor-alerta">${datos.consumoDiarioM3.toFixed(3)} m³</span>
              </div>
              <div class="info-row"><span class="label">Caudal de Diseño:</span> ${datos.caudalDisenoM3dia.toFixed(3)} m³/día</div>
              <div class="info-row"><span class="label">Porcentaje del Caudal:</span> <span class="valor-alerta">${porcentaje}%</span></div>
            </div>
            <p>Por favor revisar la planta de tratamiento a la brevedad posible.</p>
            <div class="footer">
              <p>Este es un correo automático del Sistema CMMS de Mr. B Storage.</p>
              <p>Por favor no responder a este correo.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const enviarConTimeout = async (mailOptions: any, destinatario: string): Promise<void> => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Email timeout')), TIMEOUT_MS);
      });
      try {
        await Promise.race([this.transporter.sendMail(mailOptions), timeoutPromise]);
        console.log(`📧 Alerta planta enviada a: ${destinatario}`);
      } catch (error) {
        console.error(`❌ Error enviando alerta planta a ${destinatario}:`, error.message || String(error));
      }
    };

    const promesas = datos.destinatarios
      .filter(email => email && email.trim().length > 0)
      .map(email =>
        enviarConTimeout({
          from: emailFrom,
          to: email.trim(),
          subject: asunto,
          html: htmlContent,
        }, email.trim())
      );

    await Promise.allSettled(promesas);
  }

  // ── IT TICKETS ──────────────────────────────────────────────────────────

  async enviarNuevoTicketIT(params: {
    ticketId: number;
    titulo: string;
    descripcion: string;
    prioridad: string;
    categoria: string;
    solicitante: string;
    destinatarios: string[];
  }): Promise<void> {
    const emailFrom = this.configService.get<string>('EMAIL_FROM');
    const TIMEOUT_MS = 8000;

    const prioridadLabel: Record<string, string> = {
      baja: 'Baja', media: 'Media', alta: 'Alta', critica: 'Crítica',
    };

    const html = `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9}
      .header{background:#1e3a8a;color:white;padding:20px;text-align:center;border-radius:5px 5px 0 0}
      .content{background:white;padding:30px;border-radius:0 0 5px 5px}
      .info-box{background:#f0f4ff;padding:15px;border-left:4px solid #1e3a8a;margin:20px 0}
      .info-row{margin:10px 0}.label{font-weight:bold;color:#1e3a8a}
      .badge{display:inline-block;padding:4px 10px;border-radius:3px;font-weight:bold;background:#fef3c7;color:#92400e}
      .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
    </style></head><body>
      <div class="container">
        <div class="header"><h1>🎫 Nuevo Ticket IT #${params.ticketId}</h1></div>
        <div class="content">
          <div class="info-box">
            <div class="info-row"><span class="label">Ticket #:</span> ${params.ticketId}</div>
            <div class="info-row"><span class="label">Título:</span> ${params.titulo}</div>
            <div class="info-row"><span class="label">Descripción:</span> ${params.descripcion || 'Sin descripción'}</div>
            <div class="info-row"><span class="label">Categoría:</span> ${params.categoria}</div>
            <div class="info-row"><span class="label">Prioridad:</span> <span class="badge">${prioridadLabel[params.prioridad] || params.prioridad}</span></div>
            <div class="info-row"><span class="label">Solicitante:</span> ${params.solicitante}</div>
          </div>
          <div class="footer"><p>Sistema CMMS — Mr. B Storage. No responder este correo.</p></div>
        </div>
      </div>
    </body></html>`;

    await this.enviarMultiples(emailFrom, params.destinatarios, `Nuevo Ticket IT #${params.ticketId} - ${params.titulo}`, html, TIMEOUT_MS);
  }

  async enviarTicketAsignadoIT(params: {
    ticketId: number;
    titulo: string;
    solicitante: string;
    tecnicoEmail: string;
    destinatarios: string[];
  }): Promise<void> {
    const emailFrom = this.configService.get<string>('EMAIL_FROM');
    const TIMEOUT_MS = 8000;

    const htmlTecnico = `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9}
      .header{background:#0369a1;color:white;padding:20px;text-align:center;border-radius:5px 5px 0 0}
      .content{background:white;padding:30px;border-radius:0 0 5px 5px}
      .info-box{background:#f0f9ff;padding:15px;border-left:4px solid #0369a1;margin:20px 0}
      .info-row{margin:10px 0}.label{font-weight:bold;color:#0369a1}
      .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
    </style></head><body>
      <div class="container">
        <div class="header"><h1>📋 Ticket IT Asignado a Ti</h1></div>
        <div class="content">
          <p>Se te ha asignado el siguiente ticket:</p>
          <div class="info-box">
            <div class="info-row"><span class="label">Ticket #:</span> ${params.ticketId}</div>
            <div class="info-row"><span class="label">Título:</span> ${params.titulo}</div>
            <div class="info-row"><span class="label">Solicitante:</span> ${params.solicitante}</div>
          </div>
          <div class="footer"><p>Sistema CMMS — Mr. B Storage. No responder este correo.</p></div>
        </div>
      </div>
    </body></html>`;

    const htmlSolicitante = `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9}
      .header{background:#0369a1;color:white;padding:20px;text-align:center;border-radius:5px 5px 0 0}
      .content{background:white;padding:30px;border-radius:0 0 5px 5px}
      .info-box{background:#f0f9ff;padding:15px;border-left:4px solid #0369a1;margin:20px 0}
      .info-row{margin:10px 0}.label{font-weight:bold;color:#0369a1}
      .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
    </style></head><body>
      <div class="container">
        <div class="header"><h1>✅ Tu Ticket Está Siendo Atendido</h1></div>
        <div class="content">
          <p>Tu ticket fue asignado a un técnico IT:</p>
          <div class="info-box">
            <div class="info-row"><span class="label">Ticket #:</span> ${params.ticketId}</div>
            <div class="info-row"><span class="label">Título:</span> ${params.titulo}</div>
            <div class="info-row"><span class="label">Asignado a:</span> ${params.tecnicoEmail}</div>
          </div>
          <div class="footer"><p>Sistema CMMS — Mr. B Storage. No responder este correo.</p></div>
        </div>
      </div>
    </body></html>`;

    const promises: Promise<void>[] = [];
    for (const dest of params.destinatarios) {
      const esTecnico = dest.toLowerCase() === params.tecnicoEmail.toLowerCase();
      const html = esTecnico ? htmlTecnico : htmlSolicitante;
      promises.push(this.enviarConTimeoutSimple(emailFrom, dest, `Ticket IT #${params.ticketId} Asignado`, html, TIMEOUT_MS));
    }
    await Promise.allSettled(promises);
  }

  async enviarCambioEstadoTicketIT(params: {
    ticketId: number;
    titulo: string;
    estadoAnterior: string;
    estadoNuevo: string;
    destinatarios: string[];
  }): Promise<void> {
    const emailFrom = this.configService.get<string>('EMAIL_FROM');
    const TIMEOUT_MS = 8000;

    const estadoLabel: Record<string, string> = {
      abierto: 'Abierto', en_progreso: 'En Progreso', resuelto: 'Resuelto', cerrado: 'Cerrado',
    };

    const html = `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9}
      .header{background:#1e3a8a;color:white;padding:20px;text-align:center;border-radius:5px 5px 0 0}
      .content{background:white;padding:30px;border-radius:0 0 5px 5px}
      .info-box{background:#f0f4ff;padding:15px;border-left:4px solid #1e3a8a;margin:20px 0}
      .info-row{margin:10px 0}.label{font-weight:bold;color:#1e3a8a}
      .badge-ant{display:inline-block;padding:4px 10px;border-radius:3px;font-weight:bold;background:#e5e7eb;color:#374151}
      .badge-new{display:inline-block;padding:4px 10px;border-radius:3px;font-weight:bold;background:#d1fae5;color:#065f46}
      .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
    </style></head><body>
      <div class="container">
        <div class="header"><h1>🔄 Cambio de Estado — Ticket IT</h1></div>
        <div class="content">
          <div class="info-box">
            <div class="info-row"><span class="label">Ticket #:</span> ${params.ticketId}</div>
            <div class="info-row"><span class="label">Título:</span> ${params.titulo}</div>
            <div class="info-row"><span class="label">Estado anterior:</span> <span class="badge-ant">${estadoLabel[params.estadoAnterior] || params.estadoAnterior}</span></div>
            <div class="info-row"><span class="label">Estado actual:</span> <span class="badge-new">${estadoLabel[params.estadoNuevo] || params.estadoNuevo}</span></div>
          </div>
          <div class="footer"><p>Sistema CMMS — Mr. B Storage. No responder este correo.</p></div>
        </div>
      </div>
    </body></html>`;

    await this.enviarMultiples(emailFrom, params.destinatarios, `Ticket IT #${params.ticketId} — Cambio de Estado`, html, TIMEOUT_MS);
  }

  async enviarComentarioTicketIT(params: {
    ticketId: number;
    titulo: string;
    comentario: string;
    autorEmail: string;
    destinatario: string;
  }): Promise<void> {
    const emailFrom = this.configService.get<string>('EMAIL_FROM');
    const TIMEOUT_MS = 8000;

    const html = `<!DOCTYPE html><html><head><style>
      body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
      .container{max-width:600px;margin:0 auto;padding:20px;background:#f9f9f9}
      .header{background:#7c3aed;color:white;padding:20px;text-align:center;border-radius:5px 5px 0 0}
      .content{background:white;padding:30px;border-radius:0 0 5px 5px}
      .info-box{background:#faf5ff;padding:15px;border-left:4px solid #7c3aed;margin:20px 0}
      .comentario-box{background:#f3f4f6;padding:15px;border-radius:5px;margin:15px 0;font-style:italic}
      .info-row{margin:10px 0}.label{font-weight:bold;color:#7c3aed}
      .footer{text-align:center;margin-top:20px;color:#666;font-size:12px}
    </style></head><body>
      <div class="container">
        <div class="header"><h1>💬 Nuevo Comentario — Ticket IT #${params.ticketId}</h1></div>
        <div class="content">
          <div class="info-box">
            <div class="info-row"><span class="label">Ticket #:</span> ${params.ticketId}</div>
            <div class="info-row"><span class="label">Título:</span> ${params.titulo}</div>
            <div class="info-row"><span class="label">Comentó:</span> ${params.autorEmail}</div>
          </div>
          <div class="comentario-box">${params.comentario}</div>
          <div class="footer"><p>Sistema CMMS — Mr. B Storage. No responder este correo.</p></div>
        </div>
      </div>
    </body></html>`;

    await this.enviarConTimeoutSimple(emailFrom, params.destinatario, `Nuevo comentario en Ticket IT #${params.ticketId}`, html, TIMEOUT_MS);
  }

  // ── HELPERS INTERNOS ─────────────────────────────────────────────────────

  private async enviarConTimeoutSimple(from: string, to: string, subject: string, html: string, timeoutMs: number): Promise<void> {
    try {
      await Promise.race([
        this.transporter.sendMail({ from, to, subject, html }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
      ]);
      console.log(`📧 IT email enviado a: ${to}`);
    } catch (err) {
      console.error(`❌ Error enviando IT email a ${to}:`, err?.message || err);
    }
  }

  private async enviarMultiples(from: string, destinatarios: string[], subject: string, html: string, timeoutMs: number): Promise<void> {
    const validos = destinatarios.filter(e => e && e.trim().length > 0);
    if (validos.length === 0) return;
    await Promise.allSettled(validos.map(to => this.enviarConTimeoutSimple(from, to.trim(), subject, html, timeoutMs)));
  }

  private formatearEstado(estado: string): string {
    const estados = {
      PENDIENTE: 'Pendiente',
      ASIGNADA: 'Asignada',
      EN_PROGRESO: 'En Progreso',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
    };
    return estados[estado.toUpperCase()] || estado;
  }
}
