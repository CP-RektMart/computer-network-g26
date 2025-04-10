import * as express from 'express';
import { validationResult } from 'express-validator';

import { registerUser, getUserById, getUserByUsername } from './controller';
import { validateRegisterUser } from '@/middleware/auth';

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

  const user = await registerUser({ username, email, password });

  res.status(201).json({ message: 'User registered successfully', user });
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
