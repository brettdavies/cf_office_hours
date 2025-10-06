import { describe, it, expect } from 'vitest';
import app from './index';

describe('GET /health', () => {
  it('should return 200 OK with status and timestamp', async () => {
    const res = await app.request('/health');
    const data = (await res.json()) as { status: string; timestamp: string };

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
  });

  it('should return valid ISO timestamp', async () => {
    const res = await app.request('/health');
    const data = (await res.json()) as { status: string; timestamp: string };

    const timestamp = new Date(data.timestamp);
    expect(timestamp.toISOString()).toBe(data.timestamp);
  });
});

describe('CORS Middleware', () => {
  it('should include CORS headers for allowed origin', async () => {
    const res = await app.request('/health', {
      headers: { Origin: 'http://localhost:3000' },
    });

    expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:3000');
    expect(res.headers.get('access-control-allow-credentials')).toBe('true');
  });

  it('should handle production origin', async () => {
    const res = await app.request('/health', {
      headers: { Origin: 'https://officehours.youcanjustdothings.io' },
    });

    expect(res.headers.get('access-control-allow-origin')).toBe(
      'https://officehours.youcanjustdothings.io'
    );
  });
});

describe('Error Handling', () => {
  it('should return 404 for non-existent routes', async () => {
    const res = await app.request('/nonexistent');
    const data = (await res.json()) as {
      error: { code: string; message: string; timestamp: string };
    };

    expect(res.status).toBe(404);
    expect(data.error).toHaveProperty('code', 'NOT_FOUND');
    expect(data.error).toHaveProperty('message');
    expect(data.error).toHaveProperty('timestamp');
  });

  it('should return JSON error format', async () => {
    const res = await app.request('/nonexistent');
    const data = (await res.json()) as {
      error: { code: string; message: string; timestamp: string };
    };

    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code');
    expect(data.error).toHaveProperty('message');
    expect(data.error).toHaveProperty('timestamp');
  });
});

describe('Logger Middleware', () => {
  it('should log requests (manual verification)', async () => {
    // Note: Logger outputs to console, verify manually during dev
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    // Check console output for log entry
  });
});
