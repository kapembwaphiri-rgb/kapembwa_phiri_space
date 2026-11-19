import { rm } from 'node:fs/promises';
import { basename, join } from 'node:path';
import * as authService from '../services/authService.js';
import { profileImageDirectory } from '../middleware/productImageUpload.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function login(req, res, next) {
  try {
    res.json(await authService.login(req.body.email, req.body.password));
  } catch (error) {
    next(error);
  }
}

export async function registerCustomer(req, res, next) {
  try {
    res.status(201).json(await authService.registerCustomer(req.body));
  } catch (error) {
    next(error);
  }
}

export async function getProfile(req, res, next) {
  try {
    res.json({ profile: await authService.getProfile(req.user.id, req.user.role) });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    res.json({ profile: await authService.updateProfile(req.user.id, req.user.role, req.body) });
  } catch (error) {
    next(error);
  }
}

export async function updateProfilePhoto(req, res, next) {
  if (!req.file) {
    next(new HttpError(400, 'Choose a profile image to upload.'));
    return;
  }
  const profilePhoto = `/uploads/profiles/${req.file.filename}`;
  let result;
  try {
    result = await authService.updateProfilePhoto(req.user.id, req.user.role, profilePhoto);
  } catch (error) {
    await rm(req.file.path, { force: true });
    next(error);
    return;
  }
  const previousPhoto = result.previousPhoto;
  if (previousPhoto?.startsWith('/uploads/profiles/')) {
    const previousFilename = basename(previousPhoto);
    if (previousFilename !== req.file.filename) {
      try {
        await rm(join(profileImageDirectory, previousFilename), { force: true });
      } catch (error) {
        console.error(JSON.stringify({
          event: 'profile_photo_cleanup_failed',
          userId: req.user.id,
          code: error.code || error.name || 'UNKNOWN'
        }));
      }
    }
  }
  res.json({ profile: result.profile });
}

export async function changePassword(req, res, next) {
  try {
    await authService.changePassword(req.user.id, req.user.role, req.body.currentPassword, req.body.newPassword);
    res.json({ message: 'Password updated.' });
  } catch (error) {
    next(error);
  }
}
