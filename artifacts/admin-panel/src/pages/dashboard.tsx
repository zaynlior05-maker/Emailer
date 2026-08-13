import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";
import { ArrowUpRight, Ban, Send, FileText, Activity, Palette, Mail } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Ban className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold mb-2">Failed to load dashboard data</h2>
        <p className="text-muted-foreground">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Operations Overview
          </h1>
          <p className="text-muted-foreground mt-1">System status and delivery metrics</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalSent.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Failed</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalFailed.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.emailDispatched.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.templateCount.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brands</CardTitle>
            <Palette className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.brandCount.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Delivery Volume (7 Days)</CardTitle>
            <CardDescription>Daily messages sent vs failed</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.recentActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => format(new Date(val), 'MMM d')}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <RechartsTooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="sent" name="Sent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="failed" name="Failed" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Recent Transmissions</CardTitle>
            <CardDescription>Latest API delivery logs</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(log.sentAt), 'HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-medium max-w-[150px] truncate" title={log.templateName}>
                        {log.templateName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'sent' ? 'success' : 'destructive'}>
                          {log.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {stats.recentLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                        No recent activity
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
