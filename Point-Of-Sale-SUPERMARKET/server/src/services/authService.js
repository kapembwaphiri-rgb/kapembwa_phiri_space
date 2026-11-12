import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { HttpError } from '../middleware/errorHandler.js';
import * as userRepository from '../repositories/userRepository.js';

export async function login(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findActiveUserByEmail(normalizedEmail)
    || await userRepository.findActiveCustomerAccountByEmail(normalizedEmail);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new HttpError(503, 'Authentication is not configured.');

  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  return {
    token: jwt.sign(safeUser, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }),
    user: safeUser
  };
}

export async function registerCustomer({ name, email, password }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new HttpError(503, 'Authentication is not configured.');

  const normalizedEmail = email.trim().toLowerCase();
  if (await userRepository.emailExists(normalizedEmail)) {
    throw new HttpError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await userRepository.createCustomerAccount({
    id: randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    passwordHash
  });
  if (!user) throw new HttpError(409, 'An account with this email already exists.');

  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  return {
    token: jwt.sign(safeUser, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }),
    user: safeUser
  };
}
