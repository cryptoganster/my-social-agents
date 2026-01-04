import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  /**
   * Property 5: Health Endpoint Returns Valid Response
   * Validates: Requirements 5.6
   *
   * For any HTTP GET request to the /health endpoint, the response SHALL
   * contain a status field with value "ok" and a valid ISO timestamp.
   */
  describe('health', () => {
    it('should return status ok', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
    });

    it('should return a valid ISO timestamp', () => {
      const result = appController.getHealth();
      expect(result.timestamp).toBeDefined();

      // Verify it's a valid ISO 8601 timestamp
      const parsedDate = new Date(result.timestamp);
      expect(parsedDate.toISOString()).toBe(result.timestamp);
    });

    it('should return timestamp close to current time', () => {
      const before = new Date();
      const result = appController.getHealth();
      const after = new Date();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
