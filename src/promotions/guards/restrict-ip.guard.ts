import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class RestrictIpGuard implements CanActivate {
  private readonly allowedIps = ['127.0.0.1', '::1']; // IPs permitidas (localhost IPv4 e IPv6)

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip || request.connection.remoteAddress;

    if (!this.allowedIps.includes(clientIp)) {
      throw new ForbiddenException('Acceso denegado: IP no autorizada');
    }

    return true;
  }
}
