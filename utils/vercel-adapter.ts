import { VercelRequest, VercelResponse } from "@vercel/node";
import { Request, Response, NextFunction } from "express";

export const vercelAdapter = (handler: (req: VercelRequest, res: VercelResponse) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const vercelReq = req as unknown as VercelRequest;
    const vercelRes = res as unknown as VercelResponse;

    try {
      handler(vercelReq, vercelRes);
    } catch (error) {
      next(error);
    }
  };
};