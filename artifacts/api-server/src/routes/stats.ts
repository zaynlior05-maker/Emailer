import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, templatesTable, notificationLogsTable, emailDispatchesTable, brandsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (req, res): Promise<void> => {
  const [sentRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationLogsTable)
    .where(sql`status = 'sent'`);

  const [failedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationLogsTable)
    .where(sql`status = 'failed'`);

  const [templateCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(templatesTable);

  const [brandCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(brandsTable);

  const [emailDispatchedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(emailDispatchesTable)
    .where(sql`status = 'sent'`);

  const totalSent = sentRow?.count ?? 0;
  const totalFailed = failedRow?.count ?? 0;
  const templateCount = templateCountRow?.count ?? 0;
  const brandCount = brandCountRow?.count ?? 0;
  const emailDispatched = emailDispatchedRow?.count ?? 0;
  const total = totalSent + totalFailed;
  const successRate = total > 0 ? (totalSent / total) * 100 : 0;

  const activityRows = await db.execute(sql`
    SELECT
      DATE(sent_at AT TIME ZONE 'UTC')::text AS date,
      COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
    FROM notification_logs
    WHERE sent_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(sent_at AT TIME ZONE 'UTC')
    ORDER BY date ASC
  `);

  const activityMap = new Map<string, { sent: number; failed: number }>();
  for (const row of activityRows.rows as Array<{ date: string; sent: number; failed: number }>) {
    activityMap.set(row.date, { sent: row.sent, failed: row.failed });
  }

  const recentActivity = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = activityMap.get(dateStr) ?? { sent: 0, failed: 0 };
    recentActivity.push({ date: dateStr, sent: entry.sent, failed: entry.failed });
  }

  const recentLogs = await db
    .select()
    .from(notificationLogsTable)
    .orderBy(desc(notificationLogsTable.sentAt))
    .limit(10);

  res.json({
    totalSent,
    totalFailed,
    successRate: Math.round(successRate * 10) / 10,
    templateCount,
    brandCount,
    emailDispatched,
    recentActivity,
    recentLogs,
  });
});

export default router;
