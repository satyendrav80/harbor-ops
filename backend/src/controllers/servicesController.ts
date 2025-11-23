/**
 * Services Controller
 * 
 * This controller handles HTTP concerns (request/response).
 * All business logic is delegated to the service layer.
 */

import { Request, Response } from 'express';
import { list as listService, getFilterMetadata } from '../services/services';
import type { RequestContext } from '../types/common';

/**
 * Controller for listing with advanced filtering
 * POST /services/list
 */
export async function list(req: Request, res: Response): Promise<void> {
  try {
    // Pass request context to service
    const context: RequestContext = {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    };

    // Call service function
    const result = await listService(context);

    // Send success response
    res.json(result);
  } catch (error: any) {
    // Handle errors
    console.error('Error in list:', error);
    res.status(400).json({
      error: 'Invalid filter request',
      message: error.message || 'Failed to process filters',
    });
  }
}

/**
 * Controller for getting filter metadata
 * GET /services/filter-metadata
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

