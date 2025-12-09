/**
 * Task Comment Controller
 * Handles HTTP requests for task comments
 */

import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import type { RequestContext } from '../types/common';
import * as commentService from '../services/taskComments';

export async function create(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const comment = await commentService.create(context);
    res.status(201).json(comment);
  } catch (error: any) {
    console.error('Error creating comment:', error);
    res.status(400).json({ error: error.message || 'Failed to create comment' });
  }
}

export async function update(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const comment = await commentService.update(context);
    res.json(comment);
  } catch (error: any) {
    console.error('Error updating comment:', error);
    res.status(400).json({ error: error.message || 'Failed to update comment' });
  }
}

export async function deleteComment(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    await commentService.delete(context);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    res.status(400).json({ error: error.message || 'Failed to delete comment' });
  }
}

export async function addReaction(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const reaction = await commentService.addReaction(context);
    res.status(201).json(reaction);
  } catch (error: any) {
    console.error('Error adding reaction:', error);
    const status = error.message.includes('already exists') ? 400 : 400;
    res.status(status).json({ error: error.message || 'Failed to add reaction' });
  }
}

export async function removeReaction(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    await commentService.removeReaction(context);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error removing reaction:', error);
    res.status(400).json({ error: error.message || 'Failed to remove reaction' });
  }
}
