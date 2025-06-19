import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'marquezcityfarmacias@gmail.com',
        pass: 'afsm zcjo tcwn muxr',
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetLink: string,
  ): Promise<void> {
    const mailOptions = {
      from: 'marquezcityfarmacias@gmail.com',
      to: email,
      subject: 'Recuperación de Contraseña',
      html: `
        <h2>Recuperación de Contraseña</h2>
        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Este enlace es válido por 1 hora. Si no solicitaste este cambio, ignora este correo.</p>
      `,
    };

    try {
      const info = (await this.transporter.sendMail(
        mailOptions,
      )) as nodemailer.SentMessageInfo;
      console.log(
        `Correo enviado exitosamente a ${email}. Message ID: ${info.messageId}`,
      );
    } catch (error: unknown) {
      const err = error as Error;
      console.error(
        `Error al enviar correo de recuperación a ${email}:`,
        err.message,
        err.stack,
      );
      throw new Error(`Error al enviar correo de recuperación: ${err.message}`);
    }
  }

  async sendOrderConfirmationEmail(user: any, order: any): Promise<void> {
    const mailOptions = {
      from: 'marquezcityfarmacias@gmail.com',
      to: 'alexis.correa026@gmail.com',
      subject: 'Confirmación de Orden',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmación de Orden</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              background-color: #f4f4f4;
              color: #333333;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background-color: #007bff;
              color: #ffffff;
              padding: 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .content {
              padding: 30px;
            }
            h3 {
              color: #007bff;
              font-size: 18px;
              margin-bottom: 15px;
              border-bottom: 1px solid #e0e0e0;
              padding-bottom: 10px;
            }
            p {
              margin: 10px 0;
              line-height: 1.6;
              font-size: 14px;
            }
            .info-section {
              margin-bottom: 20px;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #666666;
            }
            .divider {
              border-top: 1px solid #e0e0e0;
              margin: 20px 0;
            }
            .order-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .order-table th, .order-table td {
              border: 1px solid #e0e0e0;
              padding: 10px;
              text-align: left;
              font-size: 14px;
            }
            .order-table th {
              background-color: #f8f9fa;
              color: #333333;
            }
            .total-section {
              background-color: #f0f4ff;
              padding: 15px;
              margin-top: 20px;
              border-radius: 4px;
              text-align: right;
              font-size: 18px;
              font-weight: bold;
              color: #007bff;
            }
            @media screen and (max-width: 600px) {
              .container {
                margin: 10px;
              }
              .content {
                padding: 20px;
              }
              .order-table th, .order-table td {
                font-size: 12px;
                padding: 8px;
              }
              .total-section {
                font-size: 16px;
                padding: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Confirmación de Orden</h1>
            </div>
            <div class="content">
              <div class="info-section">
                <h3>Datos de la Orden</h3>
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio Unitario</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${order.items
                      .map(
                        (item: any) => `
                      <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>$${item.price.toFixed(2)}</td>
                      </tr>
                    `,
                      )
                      .join('')}
                  </tbody>
                </table>
              </div>
              <div class="divider"></div>
              <div class="info-section">
                <h3>Datos del Envío</h3>
                <p><strong>Comprador/a:</strong> ${user.shippingInfo.recipientName}</p>
                <p><strong>Número de Documento:</strong> ${user.shippingInfo.documentNumber}</p>
                <p><strong>Ciudad:</strong> ${user.shippingInfo.city}</p>
                <p><strong>Calle:</strong> ${user.shippingInfo.street}</p>
                <p><strong>Número:</strong> ${user.shippingInfo.streetNumber}</p>
                <p><strong>Apartamento:</strong> ${user.shippingInfo.apartment ? user.shippingInfo.apartment : '-'}</p>
                <p><strong>Código Postal:</strong> ${user.shippingInfo.postalCode}</p>
              </div>
              <div class="divider"></div>
              <div class="info-section">
                <h3>Contactos</h3>
                <p><strong>Teléfono:</strong> ${user.shippingInfo.phoneNumber}</p>
                <p><strong>Email:</strong> ${user.shippingInfo.email}</p>
                <p><strong>Notas Adicionales:</strong> ${user.shippingInfo.additionalNotes}</p>
              </div>
              <div class="total-section">
                Total: $${order.total.toFixed(2)}
              </div>
            </div>
            <div class="footer">
              <p>Gracias por su compra en Marquez City Farmacias</p>
              <p>Si tiene alguna pregunta, contáctenos en marquezcityfarmacias@gmail.com</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      const info = (await this.transporter.sendMail(
        mailOptions,
      )) as nodemailer.SentMessageInfo;
      console.log(`Correo enviado exitosamente a TEST.`);
    } catch (error: unknown) {
      const err = error as Error;
      console.error(
        `Error al enviar correo de recuperación a TEST:`,
        err.message,
        err.stack,
      );
      throw new Error(`Error al enviar correo de recuperación: ${err.message}`);
    }
  }
}
