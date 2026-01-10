import pool from '../db/db.js';

export const logAudit = async (
    userId: number | null,
    action: string,
    entityName: string,
    entityId: number | null,
    details: any = {},
    req?: any
) => {
    try {
        const ipAddress = req?.ip || req?.headers['x-forwarded-for'] || null;
        const userAgent = req?.headers['user-agent'] || null;

        await pool.query(
            `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, action, entityName, entityId, JSON.stringify(details), ipAddress, userAgent]
        );
    } catch (error) {
        console.error('Audit Log Error:', error);
    }
};
