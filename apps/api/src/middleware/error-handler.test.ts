import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from './error-handler';

describe('Error Handler Middleware', () => {
  it('should handle errors with default 500 status', async () => {
    const app = new Hono();

    app.get('/error', () => {
      throw new Error('Test error');
    });

    app.onError(errorHandler);

    const res = await app.request('/error');
    const data = (await res.json()) as {
      error: { code: string; message: string; timestamp: string };
    };

    expect(res.status).toBe(500);
    expect(data.error).toHaveProperty('code', 'INTERNAL_ERROR');
    expect(data.error).toHaveProperty('message', 'Test error');
    expect(data.error).toHaveProperty('timestamp');
  });

  it('should use custom error status and code when provided', async () => {
    const app = new Hono();

    app.get('/custom-error', () => {
      const error: any = new Error('Custom error message');
      error.status = 400;
      error.code = 'CUSTOM_ERROR';
      throw error;
    });

    app.onError(errorHandler);

    const res = await app.request('/custom-error');
    const data = (await res.json()) as {
      error: { code: string; message: string; timestamp: string };
    };

    expect(res.status).toBe(400);
    expect(data.error).toHaveProperty('code', 'CUSTOM_ERROR');
    expect(data.error).toHaveProperty('message', 'Custom error message');
  });

  it('should log errors to console', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const app = new Hono();

    app.get('/log-test', () => {
      throw new Error('Logged error');
    });

    app.onError(errorHandler);

    await app.request('/log-test');

    expect(consoleSpy).toHaveBeenCalledWith('API Error:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('should include valid ISO timestamp in error response', async () => {
    const app = new Hono();

    app.get('/timestamp-test', () => {
      throw new Error('Timestamp test');
    });

    app.onError(errorHandler);

    const res = await app.request('/timestamp-test');
    const data = (await res.json()) as {
      error: { code: string; message: string; timestamp: string };
    };

    const timestamp = new Date(data.error.timestamp);
    expect(timestamp.toISOString()).toBe(data.error.timestamp);
  });
});
