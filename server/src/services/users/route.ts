import * as express from 'express';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';
import { registerUser, getUserById, getUserByUsername } from './controller';

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
router.post(
  '/',
  body('username').isString().notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    await registerUser(req, res);
  }
);

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
router.get('/:id', getUserById);

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
router.get('/username/:username', getUserByUsername);

export default router;
