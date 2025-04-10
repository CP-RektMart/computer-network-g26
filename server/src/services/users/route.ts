import * as express from 'express';
import { validationResult } from 'express-validator';

import { registerUser, getUserById, getUserByUsername, loginUser } from './controller';
import { validateRegisterUser, protect } from '@/middleware/auth';
import { getTokenResponse } from './utils';

const router = express.Router();

/**
 * @swagger
 * api/users:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     description: Creates a new user account.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: johndoe@example.com
 *               password:
 *                 type: string
 *                 example: strongpassword123
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: Validation error or duplicate username/email
 */
router.post('/', validateRegisterUser, async (req: express.Request, res: express.Response): Promise<void> => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password }: { email: string; password: string } = req.body;
  const username: string = req.body.username.toLowerCase();

  const user = await registerUser(username, email, password);

  res.status(201).json({ message: 'User registered successfully', user });
});

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     description: Authenticates a user and returns a JWT token in a cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: strongpassword123
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                   description: JWT token
 *       400:
 *         description: Missing username or password
 *       401:
 *         description: Invalid credentials or login failure
 */
router.post('/login', async (req: express.Request, res: express.Response): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({
      success: false,
      message: 'Please provide both username and password',
    });
    return;
  }

  try {
    const user = await loginUser(username, password);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password',
      });
      return;
    }

    getTokenResponse(user, 200, res);
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Login failed',
    });
  }
});

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Users]
 *     description: Retrieves the currently authenticated user's details using the JWT token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 username:
 *                   type: string
 *                   example: johndoe
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: johndoe@example.com
 *       401:
 *         description: Unauthorized - token is missing or invalid
 *       404:
 *         description: User not found
 */
router.get('/me', protect, async (req: express.Request, res: express.Response): Promise<void> => {
  const userId: number = (req as any).userId;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const user = await getUserById(userId);

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }

  res.status(200).json(user);
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     description: Fetches user details along with related messages and group memberships.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:id', async (req: express.Request, res: express.Response): Promise<void> => {
  const userId: number = parseInt(req.params.id);

  if (isNaN(userId)) {
    res.status(400).json({ error: 'Invalid user ID' });
    return;
  }
  const user = await getUserById(userId);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.status(200).json(user);
});

/**
 * @swagger
 * /api/users/username/{username}:
 *   get:
 *     summary: Get user by username
 *     tags: [Users]
 *     description: Fetches user details by their username, including messages and group memberships.
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: The username of the user
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/username/:username', async (req: express.Request, res: express.Response): Promise<void> => {
  const username: string = req.params.username.toLowerCase();
  const user = await getUserByUsername(username);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json(user);
});

export default router;
