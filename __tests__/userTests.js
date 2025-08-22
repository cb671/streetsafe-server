jest.mock('../database/connect', () => ({
  query: jest.fn()
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}));


global.fetch = jest.fn();

const User = require('../model/userModel');
const AuthController = require('../controller/authController');
const db = require('../database/connect');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

describe('User Model and Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    

    req = {
      body: {},
      userId: null,
      cookies: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };
  });

  describe('User Model Tests', () => {
    describe('create', () => {
      it('should create a new user successfully', async () => {
        const mockUser = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          h3: '123456789',
          created_at: new Date()
        };

        bcrypt.hash.mockResolvedValue('hashedPassword123');
        db.query.mockResolvedValue({ rows: [mockUser] });

        const result = await User.create('John Doe', 'john@example.com', 'password123', '123456789');

        expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
        expect(db.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO users'),
          ['John Doe', 'john@example.com', 'hashedPassword123', '123456789']
        );
        expect(result).toEqual(mockUser);
      });

      it('should throw error when database fails', async () => {
        bcrypt.hash.mockResolvedValue('hashedPassword123');
        db.query.mockRejectedValue(new Error('Database connection failed'));

        await expect(User.create('John Doe', 'john@example.com', 'password123', '123456789'))
          .rejects.toThrow('Database error: Database connection failed');
      });
    });

    describe('findByEmail', () => {
      it('should find user by email', async () => {
        const mockUser = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          password: 'hashedPassword'
        };

        db.query.mockResolvedValue({ rows: [mockUser] });

        const result = await User.findByEmail('john@example.com');

        expect(db.query).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE email = $1',
          ['john@example.com']
        );
        expect(result).toEqual(mockUser);
      });

      it('should return null when user not found', async () => {
        db.query.mockResolvedValue({ rows: [] });

        const result = await User.findByEmail('notfound@example.com');

        expect(result).toBeNull();
      });
    });

    describe('findById', () => {
      it('should find user by id', async () => {
        const mockUser = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          h3: '123456789',
          created_at: new Date()
        };

        db.query.mockResolvedValue({ rows: [mockUser] });

        const result = await User.findById(1);

        expect(db.query).toHaveBeenCalledWith(
          'SELECT id, name, email, h3, created_at FROM users WHERE id = $1',
          [1]
        );
        expect(result).toEqual(mockUser);
      });

      it('should return null when user not found', async () => {
        db.query.mockResolvedValue({ rows: [] });

        const result = await User.findById(999);

        expect(result).toBeNull();
      });
    });

    describe('validatePassword', () => {
      it('should validate correct password', async () => {
        bcrypt.compare.mockResolvedValue(true);

        const result = await User.validatePassword('password123', 'hashedPassword');

        expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
        expect(result).toBe(true);
      });

      it('should reject incorrect password', async () => {
        bcrypt.compare.mockResolvedValue(false);

        const result = await User.validatePassword('wrongpassword', 'hashedPassword');

        expect(result).toBe(false);
      });
    });

    describe('postcodeToH3', () => {
      it('should convert valid postcode to H3 index', async () => {
        const mockApiResponse = {
          result: {
            latitude: 51.5074,
            longitude: -0.1278
          }
        };

        global.fetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockApiResponse)
        });

        db.query.mockResolvedValue({ rows: [{ h3_index: '123456789' }] });

        const result = await User.postcodeToH3('SW1A 1AA');

        expect(global.fetch).toHaveBeenCalledWith(
          'https://api.postcodes.io/postcodes/SW1A%201AA',
          expect.objectContaining({
            headers: { 'User-Agent': 'StreetSafe-App/1.0' }
          })
        );
        expect(db.query).toHaveBeenCalledWith(
          'SELECT h3_lat_lng_to_cell(POINT($1, $2), 9)::h3index as h3_index',
          [-0.1278, 51.5074]
        );
        expect(result).toBe('123456789');
      });

      it('should throw error for invalid postcode', async () => {
        global.fetch.mockResolvedValue({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Postcode not found')
        });

        await expect(User.postcodeToH3('INVALID'))
          .rejects.toThrow('Error converting postcode to H3: Invalid postcode: 404 - Postcode not found');
      });

      it('should throw error when API is unavailable', async () => {
        global.fetch.mockRejectedValue(new Error('Network error'));

        await expect(User.postcodeToH3('SW1A 1AA'))
          .rejects.toThrow('Error converting postcode to H3: Network error');
      });

      it('should throw error when no result returned', async () => {
        global.fetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({})
        });

        await expect(User.postcodeToH3('SW1A 1AA'))
          .rejects.toThrow('Error converting postcode to H3: Postcode not found');
      });
    });
  });

  describe('AuthController Tests', () => {
    describe('register', () => {
      it('should register a new user successfully', async () => {
        req.body = {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          postcode: 'SW1A 1AA'
        };

        const mockUser = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          h3: '123456789'
        };

        User.findByEmail = jest.fn().mockResolvedValue(null);
        User.postcodeToH3 = jest.fn().mockResolvedValue('123456789');
        User.create = jest.fn().mockResolvedValue(mockUser);
        jwt.sign.mockReturnValue('mockToken');

        await AuthController.register(req, res);

        expect(User.findByEmail).toHaveBeenCalledWith('john@example.com');
        expect(User.postcodeToH3).toHaveBeenCalledWith('SW1A 1AA');
        expect(User.create).toHaveBeenCalledWith('John Doe', 'john@example.com', 'password123', '123456789');
        expect(res.cookie).toHaveBeenCalledWith('auth_token', 'mockToken', expect.any(Object));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          message: "User registered successfully",
          user: mockUser
        });
      });

      it('should return error for missing fields', async () => {
        req.body = { name: 'John Doe' };

        await AuthController.register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "All fields are required"
        });
      });

      it('should return error for short password', async () => {
        req.body = {
          name: 'John Doe',
          email: 'john@example.com',
          password: '123',
          postcode: 'SW1A 1AA'
        };

        await AuthController.register(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Password must be at least 8 characters long"
        });
      });

      it('should return error for existing user', async () => {
        req.body = {
          name: 'John Doe',
          email: 'existing@example.com',
          password: 'password123',
          postcode: 'SW1A 1AA'
        };

        User.findByEmail = jest.fn().mockResolvedValue({ email: 'existing@example.com' });

        await AuthController.register(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
          error: "User with this email already exists"
        });
      });

      it('should handle postcode conversion errors', async () => {
        req.body = {
          name: 'John Doe',
          email: 'john@example.com',
          password: 'password123',
          postcode: 'INVALID'
        };

        User.findByEmail = jest.fn().mockResolvedValue(null);
        User.postcodeToH3 = jest.fn().mockRejectedValue(new Error('Invalid postcode'));

        await AuthController.register(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Internal server error",
          message: "Invalid postcode"
        });
      });
    });

    describe('login', () => {
      it('should login user successfully', async () => {
        req.body = {
          email: 'john@example.com',
          password: 'password123'
        };

        const mockUser = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          password: 'hashedPassword',
          h3: '123456789'
        };

        User.findByEmail = jest.fn().mockResolvedValue(mockUser);
        User.validatePassword = jest.fn().mockResolvedValue(true);
        jwt.sign.mockReturnValue('mockToken');

        await AuthController.login(req, res);

        expect(User.findByEmail).toHaveBeenCalledWith('john@example.com');
        expect(User.validatePassword).toHaveBeenCalledWith('password123', 'hashedPassword');
        expect(res.cookie).toHaveBeenCalledWith('auth_token', 'mockToken', expect.any(Object));
        expect(res.json).toHaveBeenCalledWith({
          message: "Login successful",
          user: {
            id: mockUser.id,
            name: mockUser.name,
            email: mockUser.email,
            h3: mockUser.h3
          }
        });
      });

      it('should return error for missing credentials', async () => {
        req.body = { email: 'john@example.com' };

        await AuthController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          error: "Email and password are required"
        });
      });

      it('should return error for non-existent user', async () => {
        req.body = {
          email: 'nonexistent@example.com',
          password: 'password123'
        };

        User.findByEmail = jest.fn().mockResolvedValue(null);

        await AuthController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid credentials"
        });
      });

      it('should return error for invalid password', async () => {
        req.body = {
          email: 'john@example.com',
          password: 'wrongpassword'
        };

        const mockUser = {
          id: 1,
          email: 'john@example.com',
          password: 'hashedPassword'
        };

        User.findByEmail = jest.fn().mockResolvedValue(mockUser);
        User.validatePassword = jest.fn().mockResolvedValue(false);

        await AuthController.login(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
          error: "Invalid credentials"
        });
      });
    });

    describe('logout', () => {
      it('should logout user successfully', async () => {
        await AuthController.logout(req, res);

        expect(res.clearCookie).toHaveBeenCalledWith('auth_token');
        expect(res.json).toHaveBeenCalledWith({ message: "Logout successful" });
      });
    });

    describe('getProfile', () => {
      it('should get user profile successfully', async () => {
        req.userId = 1;
        const mockUser = {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          h3: '123456789'
        };

        User.findById = jest.fn().mockResolvedValue(mockUser);

        await AuthController.getProfile(req, res);

        expect(User.findById).toHaveBeenCalledWith(1);
        expect(res.json).toHaveBeenCalledWith({ user: mockUser });
      });

      it('should return error when user not found', async () => {
        req.userId = 999;

        User.findById = jest.fn().mockResolvedValue(null);

        await AuthController.getProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          error: "User not found"
        });
      });

      it('should handle database errors', async () => {
        req.userId = 1;

        User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

        await AuthController.getProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: "Internal server error"
        });
      });
    });
  });
});