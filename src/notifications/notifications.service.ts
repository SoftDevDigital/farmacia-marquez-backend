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
}
