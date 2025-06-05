import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/users.schema';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';

interface GoogleUser {
  email: string;
  firstName: string;
  lastName: string;
}

interface MongoError extends Error {
  code: number;
}

interface JwtError extends Error {
  name: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private notificationsService: NotificationsService,
  ) {}

  async register(registerDto: RegisterDto): Promise<User> {
    const { email, password, firstName, lastName } = registerDto;

    // Validar que los campos no estén vacíos
    if (!email || !password || !firstName || !lastName) {
      throw new BadRequestException('Todos los campos son requeridos');
    }

    // Validar el formato del correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('El correo electrónico no es válido');
    }

    // Validar la longitud mínima de la contraseña
    if (password.length < 6) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres',
      );
    }

    // Verificar si el correo ya está registrado
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new this.userModel({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });
      return await user.save();
    } catch (error: unknown) {
      if ((error as MongoError).code === 11000) {
        // Error de duplicado en MongoDB
        throw new ConflictException('El email ya está registrado');
      }
      throw new InternalServerErrorException('Error al registrar el usuario');
    }
  }

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const { email, password } = loginDto;

    // Validar que los campos no estén vacíos
    if (!email || !password) {
      throw new BadRequestException('El correo y la contraseña son requeridos');
    }

    // Validar el formato del correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('El correo electrónico no es válido');
    }

    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.password) {
      throw new BadRequestException(
        'Este usuario se registró con Google y no puede iniciar sesión con contraseña. Usa el inicio de sesión con Google.',
      );
    }

    if (!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.generateJwt(user);
  }

  async validateGoogleUser(googleUser: GoogleUser): Promise<User> {
    const { email, firstName, lastName } = googleUser;

    // Validar que los campos no estén vacíos
    if (!email || !firstName || !lastName) {
      throw new BadRequestException('Los datos de Google están incompletos');
    }

    // Validar el formato del correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException(
        'El correo electrónico de Google no es válido',
      );
    }

    let user = await this.userModel.findOne({ email }).exec();

    if (!user) {
      try {
        user = new this.userModel({
          email,
          firstName,
          lastName,
          role: 'USER',
        });
        await user.save();
      } catch (error: unknown) {
        if ((error as MongoError).code === 11000) {
          throw new ConflictException(
            'El email ya está registrado con otro método de autenticación',
          );
        }
        throw new InternalServerErrorException(
          'Error al registrar el usuario de Google',
        );
      }
    }

    return user;
  }

  async generateJwt(user: User): Promise<{ accessToken: string }> {
    // Validar que el usuario tenga un ID válido
    if (!user._id) {
      throw new InternalServerErrorException(
        'El usuario no tiene un ID válido',
      );
    }

    const payload = { sub: user._id, email: user.email, role: user.role };
    try {
      const accessToken = this.jwtService.sign(payload);
      return { accessToken };
    } catch (error: unknown) {
      throw new InternalServerErrorException('Error al generar el token JWT');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    // Validar que el campo email no esté vacío
    if (!email) {
      throw new BadRequestException('El correo es requerido');
    }

    // Validar el formato del correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('El correo electrónico no es válido');
    }

    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si el usuario tiene contraseña (no es un usuario de Google)
    if (!user.password) {
      throw new BadRequestException(
        'Este usuario se registró con Google y no puede recuperar contraseña',
      );
    }

    // Generar un token de recuperación (válido por 1 hora)
    const payload = { sub: user._id, type: 'reset-password' };
    let resetToken: string;
    try {
      resetToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        'Error al generar el token de recuperación',
      );
    }

    // Enviar correo con el enlace de recuperación
    const resetLink = `http://localhost:3003/auth/reset-password?token=${resetToken}`;
    try {
      await this.notificationsService.sendPasswordResetEmail(
        user.email,
        resetLink,
      );
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        'Error al enviar el correo de recuperación',
      );
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password } = resetPasswordDto;

    // Validar que los campos no estén vacíos
    if (!token || !password) {
      throw new BadRequestException('El token y la contraseña son requeridos');
    }

    // Validar la longitud mínima de la contraseña
    if (password.length < 6) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 6 caracteres',
      );
    }

    // Verificar el token
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(token);
      if (payload.type !== 'reset-password') {
        throw new BadRequestException('Token inválido');
      }
    } catch (error: unknown) {
      if ((error as JwtError).name === 'TokenExpiredError') {
        throw new BadRequestException('El token ha expirado');
      }
      throw new BadRequestException('Token inválido');
    }

    // Buscar el usuario
    const user = await this.userModel.findOne({ _id: payload.sub }).exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si el usuario tiene contraseña (no es un usuario de Google)
    if (!user.password) {
      throw new BadRequestException(
        'Este usuario se registró con Google y no puede recuperar contraseña',
      );
    }

    // Actualizar la contraseña
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      await user.save();
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        'Error al actualizar la contraseña',
      );
    }
  }
}
