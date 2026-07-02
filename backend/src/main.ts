import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure Global Prefix
  app.setGlobalPrefix('api');
  
  // Enable CORS for frontend integration
  app.enableCors();

  // Configure Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('Polymarket Clone API')
    .setDescription('The Decentralized Prediction Market Platform API Description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`[Bootstrap] Backend application running on: http://localhost:${port}/api`);
  console.log(`[Bootstrap] Swagger documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
