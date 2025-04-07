import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();
const userController = new UserController();

// Create a new user
router.post('/', userController.createUser);

// Get all users
router.get('/', userController.getAllUsers);

// Get user by ID
router.get('/:id', userController.getUserById);

// Get user by username
router.get('/username/:username', userController.getUserByUsername);

// Get user account summary
router.get('/:id/accounts', userController.getUserAccountSummary);

export default router; 