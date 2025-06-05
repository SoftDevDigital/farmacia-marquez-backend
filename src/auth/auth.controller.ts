import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  Response,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Usuario registrado', type: Object })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 409, description: 'El email ya está registrado' })
  async register(@Body() registerDto: RegisterDto) {
    if (!registerDto || Object.keys(registerDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.authService.register(registerDto);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Error al registrar el usuario');
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener un token JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Token JWT generado', type: Object })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o usuario registrado con Google',
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto) {
    if (!loginDto || Object.keys(loginDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      return await this.authService.login(loginDto);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new UnauthorizedException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Error al iniciar sesión');
    }
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Correo de recuperación enviado' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o usuario registrado con Google',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 500,
    description: 'Error al enviar el correo de recuperación',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    if (!forgotPasswordDto || Object.keys(forgotPasswordDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      await this.authService.forgotPassword(forgotPasswordDto);
      return { message: 'Correo de recuperación enviado' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof InternalServerErrorException) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al procesar la solicitud de recuperación',
      );
    }
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Contraseña restablecida' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos, token inválido o expirado',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 500,
    description: 'Error al restablecer la contraseña',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    if (!resetPasswordDto || Object.keys(resetPasswordDto).length === 0) {
      throw new BadRequestException(
        'El cuerpo de la solicitud no puede estar vacío',
      );
    }

    try {
      await this.authService.resetPassword(resetPasswordDto);
      return { message: 'Contraseña restablecida exitosamente' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof InternalServerErrorException) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al restablecer la contraseña',
      );
    }
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Iniciar autenticación con Google' })
  @ApiResponse({ status: 302, description: 'Redirige al login de Google' })
  @ApiResponse({
    status: 500,
    description: 'Error en la autenticación con Google',
  })
  async googleAuth() {
    // Este endpoint inicia el flujo de autenticación con Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Callback de autenticación con Google' })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso, retorna token JWT y URL de redirección',
    type: Object,
  })
  @ApiResponse({
    status: 401,
    description: 'Fallo en la autenticación con Google',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos del usuario de Google no válidos',
  })
  @ApiResponse({
    status: 500,
    description: 'Error al generar el token JWT',
  })
  async googleAuthCallback(@Request() req: any, @Response() res: any) {
    if (!req.user) {
      throw new UnauthorizedException('Fallo en la autenticación con Google');
    }

    try {
      const tokenResponse = await this.authService.generateJwt(req.user);
      const accessToken = tokenResponse.accessToken;

      // Devolver una página HTML que envíe el token y la URL de redirección al frontend
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                accessToken: '${accessToken}',
                redirectUrl: 'http://localhost:3001/'
              }, 'http://localhost:3001');
              window.close();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof InternalServerErrorException) {
        throw new InternalServerErrorException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al procesar la autenticación con Google',
      );
    }
  }
}
