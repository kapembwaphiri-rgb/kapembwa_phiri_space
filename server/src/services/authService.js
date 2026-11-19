import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { HttpError } from '../middleware/errorHandler.js';
import * as userRepository from '../repositories/userRepository.js';
import { normalizeAuthRole } from '../middleware/authMiddleware.js';

export async function login(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userRepository.findActiveUserByEmail(normalizedEmail)
    || await userRepository.findActiveCustomerAccountByEmail(normalizedEmail);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Invalid email or password.');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new HttpError(503, 'Authentication is not configured.');

  const safeUser = { id: user.id, name: user.name, email: user.email, role: normalizeAuthRole(user.role) };
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

  const safeUser = { id: user.id, name: user.name, email: user.email, role: normalizeAuthRole(user.role) };
  return {
    token: jwt.sign(safeUser, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }),
    user: safeUser
  };
}

export async function getProfile(id, role) {
  const profile = await userRepository.getProfile(id, role);
  if (!profile) throw new HttpError(404, 'Profile not found.');
  return profile;
}

export async function updateProfile(id, role, input) {
  const profile = await userRepository.updateProfile(id, role, {
    name: input.name.trim(),
    phone: input.phone?.trim() || ''
  });
  if (!profile) throw new HttpError(404, 'Profile not found.');
  return profile;
}

export async function updateProfilePhoto(id, role, profilePhoto) {
  const previous = await userRepository.getProfile(id, role);
  if (!previous) throw new HttpError(404, 'Profile not found.');
  const profile = await userRepository.updateProfilePhoto(id, role, profilePhoto);
  if (!profile) throw new HttpError(404, 'Profile not found.');
  return { profile, previousPhoto: previous.profile_photo };
}

export async function changePassword(id, role, currentPassword, newPassword) {
  const passwordHash = await userRepository.getPasswordHash(id, role);
  if (!passwordHash || !(await bcrypt.compare(currentPassword, passwordHash))) {
    throw new HttpError(400, 'Current password is incorrect.');
  }
  const nextHash = await bcrypt.hash(newPassword, 12);
  if (!(await userRepository.updatePassword(id, role, nextHash))) {
    throw new HttpError(404, 'Profile not found.');
  }
}
