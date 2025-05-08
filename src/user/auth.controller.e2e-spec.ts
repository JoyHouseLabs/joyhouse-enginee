import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register should fail with invalid body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({})
      .expect(400);
    expect(res.body.message || res.body).toBeDefined();
  });

  it('POST /api/auth/login should fail with invalid body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({})
      .expect(400);
    expect(res.body.message || res.body).toBeDefined();
  });

  it('POST /api/auth/wallet-signature-login should fail with invalid body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/wallet-signature-login')
      .send({})
      .expect(400);
    expect(res.body.message || res.body).toBeDefined();
  });
});
