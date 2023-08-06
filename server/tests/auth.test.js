process.env.JWT_SECRET = 'test-secret';
const jwt = require('jsonwebtoken');
const { signToken, requireAuth, requireRole } = require('../src/middleware/auth');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('auth middleware', () => {
  test('signToken embeds id and role', () => {
    const token = signToken({ _id: '507f1f77bcf86cd799439011', role: 'admin', email: 'a@b.c' });
    const decoded = jwt.verify(token, 'test-secret');
    expect(decoded.sub).toBe('507f1f77bcf86cd799439011');
    expect(decoded.role).toBe('admin');
  });

  test('requireAuth rejects a missing token', () => {
    const res = mockRes();
    requireAuth({ headers: {} }, res, () => {});
    expect(res.statusCode).toBe(401);
  });

  test('requireAuth accepts a valid token', () => {
    const token = signToken({ _id: '1', role: 'user', email: 'u@b.c' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    let called = false;
    requireAuth(req, mockRes(), () => {
      called = true;
    });
    expect(called).toBe(true);
    expect(req.user.role).toBe('user');
  });

  test('requireRole blocks the wrong role', () => {
    const res = mockRes();
    let called = false;
    requireRole('admin')({ user: { role: 'user' } }, res, () => {
      called = true;
    });
    expect(called).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  test('requireRole allows a matching role', () => {
    let called = false;
    requireRole('admin', 'user')({ user: { role: 'admin' } }, mockRes(), () => {
      called = true;
    });
    expect(called).toBe(true);
  });
});
