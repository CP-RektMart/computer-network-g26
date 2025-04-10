import * as express from 'express';
import { body, validationResult } from 'express-validator';

import { registerUser, getUserById, getUserByUsername, loginUser, updateUsername } from './controller';
import { validateRegisterUser, protect } from '@/middleware/auth';
import { getSignedJwtToken } from './utils';

const router = express.Router();

/**
 * @swagger
 * /api/users:
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

    const token = getSignedJwtToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Login failed',
    });
  }
});

/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Logout the current user
 *     tags: [Users]
 *     description: Logs out the current user by invalidating the token.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized - token is missing or invalid
 */
router.post('/logout', protect, (req: express.Request, res: express.Response): void => {
  // With JWT in Authorization header, we don't need to clear cookies
  // The client is responsible for removing the token
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
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

/**
 * @swagger
 * /api/users/username:
 *   put:
 *     summary: Update user's username
 *     tags: [Users]
 *     description: Updates the authenticated user's username
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *                 example: newusername
 *     responses:
 *       200:
 *         description: Username updated successfully
 *       400:
 *         description: Validation error or username already exists
 *       401:
 *         description: Unauthorized - token is missing or invalid
 *       404:
 *         description: User not found
 */
router.put(
  '/username',
  protect,
  body('username').isString().notEmpty().withMessage('Username is required'),
  async (req: express.Request, res: express.Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const userId: number = (req as any).userId;
    const newUsername: string = req.body.username.toLowerCase();

    try {
      const user = await updateUsername(userId, newUsername);
      res.status(200).json({
        success: true,
        message: 'Username updated successfully',
        user: {
          userId: user.id,
          username: user.username,
          email: user.email,
        },
      });
    } catch (error: any) {
      if (error.message === 'Username already exists') {
        res.status(400).json({ success: false, message: error.message });
      } else {
        res.status(500).json({ success: false, message: 'Failed to update username' });
      }
    }
  }
);

export default router;
