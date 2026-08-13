import { useState } from "react";
import { 
  useListNotificationLogs, 
  ListNotificationLogsStatus,
  useListEmailDispatches,
  ListEmailDispatchesStatus
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { History, Loader2, RefreshCw, AlertCircle, MessageSquare, Mail } from "lucide-react";

export default function DeliveryLogs() {
  const [tab, setTab] = useState<"telegram" | "email">("telegram");
  
  // Telegram State
  const [tgStatusFilter, setTgStatusFilter] = useState<ListNotificationLogsStatus>(ListNotificationLogsStatus.all);
  const [tgPage, setTgPage] = useState(0);
  
  // Email State
  const [emailStatusFilter, setEmailStatusFilter] = useState<ListEmailDispatchesStatus>(ListEmailDispatchesStatus.all);
  const [emailPage, setEmailPage] = useState(0);

  const limit = 20;

  // Telegram query
  const { 
    data: tgData, 
    isLoading: tgLoading, 
    refetch: tgRefetch, 
    isFetching: tgFetching 
  } = useListNotificationLogs({
    limit,
    offset: tgPage * limit,
    status: tgStatusFilter === ListNotificationLogsStatus.all ? undefined : tgStatusFilter,
  });

  // Email query
  const {
    data: emailData,
    isLoading: emailLoading,
    refetch: emailRefetch,
    isFetching: emailFetching
  } = useListEmailDispatches({
    limit,
    offset: emailPage * limit,
    status: emailStatusFilter === ListEmailDispatchesStatus.all ? undefined : emailStatusFilter,
  });

  const tgTotal = tgData?.total || 0;
  const tgMaxPage = Math.max(0, Math.ceil(tgTotal / limit) - 1);

  const emailTotal = emailData?.total || 0;
  const emailMaxPage = Math.max(0, Math.ceil(emailTotal / limit) - 1);

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b pb-6 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-8 w-8 text-primary" />
            Delivery Logs
          </h1>
          <p className="text-muted-foreground mt-1">Immutable audit trail of all outgoing transmissions.</p>
        </div>
        
        <Tabs value={tab} onValueChange={(v) => setTab(v as "telegram" | "email")} className="w-[300px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="telegram" className="gap-2">
              <MessageSquare className="h-4 w-4" /> Telegram
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" /> Email
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "telegram" && (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          <div className="flex justify-between items-center shrink-0">
            <h2 className="text-xl font-semibold">Telegram Dispatches</h2>
            <div className="flex items-center gap-4">
              <Select 
                value={tgStatusFilter} 
                onValueChange={(val) => {
                  setTgStatusFilter(val as ListNotificationLogsStatus);
                  setTgPage(0);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ListNotificationLogsStatus.all}>All Statuses</SelectItem>
                  <SelectItem value={ListNotificationLogsStatus.sent}>Sent Successfully</SelectItem>
                  <SelectItem value={ListNotificationLogsStatus.failed}>Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => tgRefetch()} disabled={tgFetching}>
                <RefreshCw className={`h-4 w-4 ${tgFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-card">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Chat ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[300px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tgLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : tgData?.logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No logs found matching current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tgData?.logs.map((log) => (
                      <TableRow key={log.id} className={log.status === 'failed' ? 'bg-destructive/5 hover:bg-destructive/10' : ''}>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {format(new Date(log.sentAt), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>
                        <TableCell className="font-medium">{log.templateName}</TableCell>
                        <TableCell>{log.recipientName || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.chatId}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'sent' ? 'success' : 'destructive'} className="uppercase text-[10px] tracking-widest font-bold">
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.status === 'failed' ? (
                            <span className="flex items-center gap-1 text-destructive font-medium">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              <span className="truncate" title={log.errorMessage || 'Unknown error'}>
                                {log.errorMessage || 'Unknown error'}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">
                              MSG ID: {log.messageId || 'N/A'}
                              {log.caseReference && ` • Ref: ${log.caseReference}`}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="h-14 border-t bg-muted/20 flex items-center justify-between px-6 shrink-0">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{tgData?.logs.length || 0}</span> of <span className="font-medium text-foreground">{tgTotal}</span> entries
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTgPage(p => Math.max(0, p - 1))}
                  disabled={tgPage === 0 || tgLoading}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium px-4">
                  Page {tgPage + 1} of {tgMaxPage + 1 || 1}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setTgPage(p => p + 1)}
                  disabled={tgPage >= tgMaxPage || tgLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "email" && (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          <div className="flex justify-between items-center shrink-0">
            <h2 className="text-xl font-semibold">Email Dispatches</h2>
            <div className="flex items-center gap-4">
              <Select 
                value={emailStatusFilter} 
                onValueChange={(val) => {
                  setEmailStatusFilter(val as ListEmailDispatchesStatus);
                  setEmailPage(0);
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ListEmailDispatchesStatus.all}>All Statuses</SelectItem>
                  <SelectItem value={ListEmailDispatchesStatus.sent}>Sent Successfully</SelectItem>
                  <SelectItem value={ListEmailDispatchesStatus.failed}>Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => emailRefetch()} disabled={emailFetching}>
                <RefreshCw className={`h-4 w-4 ${emailFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-card">
            <div className="flex-1 overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : emailData?.dispatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No emails found matching current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    emailData?.dispatches.map((email) => (
                      <TableRow key={email.id} className={email.status === 'failed' ? 'bg-destructive/5 hover:bg-destructive/10' : ''}>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {format(new Date(email.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                        </TableCell>
                        <TableCell className="font-medium">{email.brandName}</TableCell>
                        <TableCell className="font-mono text-xs">{email.recipientEmail}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={email.emailSubject}>
                          {email.emailSubject}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant={email.status === 'sent' ? 'success' : 'destructive'} className="uppercase text-[10px] tracking-widest font-bold">
                              {email.status}
                            </Badge>
                            {email.status === 'failed' && email.errorMessage && (
                              <span className="flex items-center gap-1 text-[10px] text-destructive font-medium max-w-[200px] truncate" title={email.errorMessage}>
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                {email.errorMessage}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            <div className="h-14 border-t bg-muted/20 flex items-center justify-between px-6 shrink-0">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{emailData?.dispatches.length || 0}</span> of <span className="font-medium text-foreground">{emailTotal}</span> entries
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEmailPage(p => Math.max(0, p - 1))}
                  disabled={emailPage === 0 || emailLoading}
                >
                  Previous
                </Button>
                <div className="text-sm font-medium px-4">
                  Page {emailPage + 1} of {emailMaxPage + 1 || 1}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEmailPage(p => p + 1)}
                  disabled={emailPage >= emailMaxPage || emailLoading}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
