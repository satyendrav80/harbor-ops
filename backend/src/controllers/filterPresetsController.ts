/**
 * Filter Presets Controller
 * Handles HTTP requests for filter presets
 */

import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import type { RequestContext } from '../types/common';
import * as filterPresetsService from '../services/filterPresets';

/**
 * Get all filter presets for the current user
 */
export async function list(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const result = await filterPresetsService.list(context);
    res.json(result);
  } catch (error: any) {
    console.error('Error listing filter presets:', error);
    res.status(400).json({ error: error.message || 'Failed to list filter presets' });
  }
}

/**
 * Create a new filter preset
 */
export async function create(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const preset = await filterPresetsService.create(context);
    res.status(201).json(preset);
  } catch (error: any) {
    console.error('Error creating filter preset:', error);
    res.status(400).json({ error: error.message || 'Failed to create filter preset' });
  }
}

/**
 * Update an existing filter preset
 */
export async function update(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const preset = await filterPresetsService.update(context);
    res.json(preset);
  } catch (error: any) {
    console.error('Error updating filter preset:', error);
    res.status(400).json({ error: error.message || 'Failed to update filter preset' });
  }
}

/**
 * Delete a filter preset
 */
export async function deletePreset(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    await filterPresetsService.delete(context);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting filter preset:', error);
    res.status(400).json({ error: error.message || 'Failed to delete filter preset' });
  }
}

