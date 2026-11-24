import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.enableShutdownHooks();
  try {
    const config = app.get(ConfigService);
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: {
        host: config.get<string>('AUTHORIZATION_HOST', '127.0.0.1'),
        port: Number(config.get<string>('PORT', '4003')),
      },
    });
    await app.init();
    await app.startAllMicroservices();
  } catch (error) {
    await app.close();
    throw error;
  }
}
void bootstrap().catch(() => {
  console.error(
    'Authorization startup failed; check configuration and dependency availability',
  );
  process.exitCode = 1;
});
