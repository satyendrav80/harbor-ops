/**
 * Task Controller
 * Handles HTTP requests for tasks
 */

import type { Request, Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import type { RequestContext } from '../types/common';
import * as taskService from '../services/tasks';
import { getFilterMetadata } from '../services/tasks/metadata';

export async function create(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const task = await taskService.create(context);
    res.status(201).json(task);
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(400).json({ error: error.message || 'Failed to create task' });
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

    const task = await taskService.update(context);
    res.json(task);
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(400).json({ error: error.message || 'Failed to update task' });
  }
}

export async function deleteTask(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    await taskService.delete(context);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(400).json({ error: error.message || 'Failed to delete task' });
  }
}

export async function get(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const task = await taskService.get(context);
    res.json(task);
  } catch (error: any) {
    console.error('Error fetching task:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch task' });
  }
}

export async function list(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const result = await taskService.list(context);
    res.json(result);
  } catch (error: any) {
    console.error('Error listing tasks:', error);
    res.status(400).json({ error: error.message || 'Failed to list tasks' });
  }
}

export async function updateStatus(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const task = await taskService.updateStatus(context);
    res.json(task);
  } catch (error: any) {
    console.error('Error updating task status:', error);
    res.status(400).json({ error: error.message || 'Failed to update task status' });
  }
}

export async function reopen(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const task = await taskService.reopen(context);
    res.json(task);
  } catch (error: any) {
    console.error('Error reopening task:', error);
    res.status(400).json({ error: error.message || 'Failed to reopen task' });
  }
}

export async function addDependency(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const dependency = await taskService.addDependency(context);
    res.status(201).json(dependency);
  } catch (error: any) {
    console.error('Error adding dependency:', error);
    const status = error.message.includes('already exists') ? 400 : 400;
    res.status(status).json({ error: error.message || 'Failed to add dependency' });
  }
}

export async function removeDependency(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    await taskService.removeDependency(context);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error removing dependency:', error);
    res.status(400).json({ error: error.message || 'Failed to remove dependency' });
  }
}

export async function createSubtask(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const subtask = await taskService.createSubtask(context);
    res.status(201).json(subtask);
  } catch (error: any) {
    console.error('Error creating subtask:', error);
    res.status(400).json({ error: error.message || 'Failed to create subtask' });
  }
}

export async function getSubtasks(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const subtasks = await taskService.getSubtasks(context);
    res.json(subtasks);
  } catch (error: any) {
    console.error('Error fetching subtasks:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch subtasks' });
  }
}

/**
 * Controller for getting filter metadata
 * GET /tasks/filter-metadata
 */
export async function getMetadata(_req: Request, res: Response): Promise<void> {
  try {
    const metadata = getFilterMetadata();
    res.json(metadata);
  } catch (error: any) {
    console.error('Error in getMetadata:', error);
    res.status(500).json({
      error: 'Failed to fetch filter metadata',
      message: error.message || 'Internal server error',
    });
  }
}
