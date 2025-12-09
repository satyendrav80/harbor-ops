/**
 * Sprint Controller
 * Handles HTTP requests for sprints
 */

import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth';
import type { RequestContext } from '../types/common';
import * as sprintService from '../services/sprints';

export async function create(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const sprint = await sprintService.create(context);
    res.status(201).json(sprint);
  } catch (error: any) {
    console.error('Error creating sprint:', error);
    res.status(400).json({ error: error.message || 'Failed to create sprint' });
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

    const sprint = await sprintService.update(context);
    res.json(sprint);
  } catch (error: any) {
    console.error('Error updating sprint:', error);
    res.status(400).json({ error: error.message || 'Failed to update sprint' });
  }
}

export async function deleteSprint(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    await sprintService.delete(context);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting sprint:', error);
    res.status(400).json({ error: error.message || 'Failed to delete sprint' });
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

    const sprint = await sprintService.get(context);
    res.json(sprint);
  } catch (error: any) {
    console.error('Error fetching sprint:', error);
    res.status(400).json({ error: error.message || 'Failed to fetch sprint' });
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

    const result = await sprintService.list(context);
    res.json(result);
  } catch (error: any) {
    console.error('Error listing sprints:', error);
    res.status(400).json({ error: error.message || 'Failed to list sprints' });
  }
}

export async function addTasksToSprint(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    await sprintService.addTasksToSprint(context);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error adding tasks to sprint:', error);
    res.status(400).json({ error: error.message || 'Failed to add tasks to sprint' });
  }
}

export async function removeTaskFromSprint(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    await sprintService.removeTaskFromSprint(context);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error removing task from sprint:', error);
    res.status(400).json({ error: error.message || 'Failed to remove task from sprint' });
  }
}

export async function getBurndownData(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const data = await sprintService.getBurndownData(context);
    res.json(data);
  } catch (error: any) {
    console.error('Error generating burndown data:', error);
    res.status(400).json({ error: error.message || 'Failed to generate burndown data' });
  }
}

export async function getGanttData(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const data = await sprintService.getGanttData(context);
    res.json(data);
  } catch (error: any) {
    console.error('Error generating Gantt data:', error);
    res.status(400).json({ error: error.message || 'Failed to generate Gantt data' });
  }
}
export async function complete(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const result = await sprintService.complete(context);
    res.json(result);
  } catch (error: any) {
    console.error('Error completing sprint:', error);
    res.status(400).json({ error: error.message || 'Failed to complete sprint' });
  }
}

export async function cancel(req: AuthRequest, res: Response) {
  try {
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    const result = await sprintService.cancel(context);
    res.json(result);
  } catch (error: any) {
    console.error('Error canceling sprint:', error);
    res.status(400).json({ error: error.message || 'Failed to cancel sprint' });
  }
}
