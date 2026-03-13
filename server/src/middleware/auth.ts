import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
    id: string;
    orgId: string;
    role: 'admin' | 'technician';
    email: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token não fornecido' });
        return;
    }

    const token = header.slice(7);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
}
