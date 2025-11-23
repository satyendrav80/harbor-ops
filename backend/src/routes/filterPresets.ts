/**
 * Filter Presets Routes
 */

import express from 'express';
import * as filterPresetsController from '../controllers/filterPresetsController';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/filter-presets
 * Get all filter presets for the current user
 * Query params: pageId (optional) - filter by page ID
 */
router.get('/', filterPresetsController.list);

/**
 * POST /api/filter-presets
 * Create a new filter preset
 * Body: { pageId, name, filters, isShared? }
 */
router.post('/', filterPresetsController.create);

/**
 * PUT /api/filter-presets/:id
 * Update an existing filter preset
 * Body: { name?, filters?, isShared? }
 */
router.put('/:id', filterPresetsController.update);

/**
 * DELETE /api/filter-presets/:id
 * Delete a filter preset
 */
router.delete('/:id', filterPresetsController.deletePreset);

export default router;

