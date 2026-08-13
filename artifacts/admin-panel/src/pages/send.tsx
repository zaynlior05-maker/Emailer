import { useState, useMemo, useEffect } from "react";
import { 
  useListTemplates, 
  useListBrands,
  useSendNotification, 
  usePreviewNotification,
  useSendEmail,
  usePreviewEmail
} from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Loader2, Sparkles, MessageSquare, Mail, Send as SendIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const sendSchema = z.object({
  mode: z.enum(["telegram", "email"]),
  templateId: z.coerce.number().min(1, "Please select a template"),
  chatId: z.string().optional(),
  brandKey: z.string().optional(),
  recipientEmail: z.string().optional(),
  emailSubject: z.string().optional(),
  variables: z.record(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.mode === "telegram") {
    if (!data.chatId) ctx.addIssue({ path: ["chatId"], code: z.ZodIssueCode.custom, message: "Chat ID is required" });
  } else {
    if (!data.brandKey) ctx.addIssue({ path: ["brandKey"], code: z.ZodIssueCode.custom, message: "Please select a brand" });
    if (!data.recipientEmail) ctx.addIssue({ path: ["recipientEmail"], code: z.ZodIssueCode.custom, message: "Recipient email is required" });
    else if (!/^\S+@\S+\.\S+$/.test(data.recipientEmail)) ctx.addIssue({ path: ["recipientEmail"], code: z.ZodIssueCode.custom, message: "Invalid email address" });
    if (!data.emailSubject) ctx.addIssue({ path: ["emailSubject"], code: z.ZodIssueCode.custom, message: "Subject is required" });
  }
});

type SendFormValues = z.infer<typeof sendSchema>;

function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '').trim()))];
}

export default function SendNotification() {
  const [deliveryMode, setDeliveryMode] = useState<"telegram" | "email">("telegram");
  const { data: templates, isLoading: isLoadingTemplates } = useListTemplates();
  const { data: brands, isLoading: isLoadingBrands } = useListBrands();
  
  const sendTelegramMutation = useSendNotification();
  const previewTelegramMutation = usePreviewNotification();
  const sendEmailMutation = useSendEmail();
  const previewEmailMutation = usePreviewEmail();
  
  const { toast } = useToast();
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const form = useForm<SendFormValues>({
    resolver: zodResolver(sendSchema),
    defaultValues: {
      mode: "telegram",
      templateId: 0,
      chatId: "",
      brandKey: "",
      recipientEmail: "",
      emailSubject: "",
      variables: {},
    },
  });

  const currentMode = form.watch("mode");
  const selectedTemplateId = form.watch("templateId");
  const selectedBrandKey = form.watch("brandKey");
  const formVariables = form.watch("variables") || {};

  const selectedTemplate = useMemo(() => 
    templates?.find(t => t.id === selectedTemplateId), 
  [templates, selectedTemplateId]);

  const requiredVariables = useMemo(() => {
    if (!selectedTemplate) return [];
    const contentVars = extractVariables(selectedTemplate.content);
    const emailVars = deliveryMode === "email" && selectedTemplate.emailContent 
      ? extractVariables(selectedTemplate.emailContent) 
      : [];
    return [...new Set([...contentVars, ...emailVars])];
  }, [selectedTemplate, deliveryMode]);

  // When template changes, auto-fill subject if in email mode
  useEffect(() => {
    if (deliveryMode === "email" && selectedTemplate?.emailSubject) {
      form.setValue("emailSubject", selectedTemplate.emailSubject);
    }
  }, [selectedTemplate, deliveryMode, form]);

  // Update mode when tab changes
  useEffect(() => {
    form.setValue("mode", deliveryMode);
    // Reset relevant fields
    form.setValue("variables", {});
    setPreviewHtml(null);
  }, [deliveryMode, form]);

  // Update preview when variables change
  useEffect(() => {
    const vars = form.getValues("variables") || {};
    
    if (deliveryMode === "telegram") {
      if (selectedTemplateId > 0 && selectedTemplate) {
        previewTelegramMutation.mutate(
          { data: { templateId: selectedTemplateId, variables: vars } },
          {
            onSuccess: (res) => setPreviewHtml(res.rendered),
            onError: () => setPreviewHtml(null)
          }
        );
      } else {
        setPreviewHtml(null);
      }
    } else {
      if (selectedTemplateId > 0 && selectedTemplate && selectedBrandKey) {
        previewEmailMutation.mutate(
          { data: { templateId: selectedTemplateId, brandKey: selectedBrandKey, variables: vars } },
          {
            onSuccess: (res) => setPreviewHtml(res.html),
            onError: () => setPreviewHtml(null)
          }
        );
      } else {
        setPreviewHtml(null);
      }
    }
  }, [selectedTemplateId, selectedBrandKey, JSON.stringify(formVariables), deliveryMode]);

  const onSubmit = (data: SendFormValues) => {
    const missing = requiredVariables.filter(v => !data.variables?.[v]);
    if (missing.length > 0) {
      toast({ title: `Missing variables: ${missing.join(', ')}`, variant: "destructive" });
      return;
    }

    if (data.mode === "telegram") {
      sendTelegramMutation.mutate({ data: {
        templateId: data.templateId,
        chatId: data.chatId!,
        variables: data.variables || {},
      }}, {
        onSuccess: (res) => {
          if (res.success) {
            toast({ title: "Telegram sent successfully", description: `Message ID: ${res.messageId || 'N/A'}` });
            form.reset({ ...form.getValues(), variables: {} });
          } else {
            toast({ title: "Failed to send", description: res.error || "Unknown error", variant: "destructive" });
          }
        },
        onError: () => toast({ title: "Network error", variant: "destructive" })
      });
    } else {
      sendEmailMutation.mutate({ data: {
        templateId: data.templateId,
        brandKey: data.brandKey!,
        recipientEmail: data.recipientEmail!,
        emailSubject: data.emailSubject!,
        variables: data.variables || {},
      }}, {
        onSuccess: (res) => {
          if (res.success) {
            toast({ title: "Email dispatched successfully", description: `Dispatch ID: ${res.dispatchId || 'N/A'}` });
            form.reset({ ...form.getValues(), variables: {} });
          } else {
            toast({ title: "Failed to send email", description: res.error || "Unknown error", variant: "destructive" });
          }
        },
        onError: () => toast({ title: "Network error", variant: "destructive" })
      });
    }
  };

  const isPending = sendTelegramMutation.isPending || sendEmailMutation.isPending;
  const isPreviewPending = previewTelegramMutation.isPending || previewEmailMutation.isPending;

  return (
    <div className="p-8 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="mb-8 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <SendIcon className="h-8 w-8 text-primary" />
            Compose & Send
          </h1>
          <p className="text-muted-foreground mt-1">Select a template, fill variables, and dispatch immediately.</p>
        </div>
        
        <Tabs value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as "telegram" | "email")} className="w-[300px]">
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

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 xl:col-span-8 overflow-y-auto pr-2 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle>Destination ({deliveryMode === "telegram" ? "Telegram" : "Email"})</CardTitle>
                  <CardDescription>Select template and target recipient</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="templateId"
                      render={({ field }) => (
                        <FormItem className={deliveryMode === "email" ? "col-span-full md:col-span-1" : "col-span-1"}>
                          <FormLabel>Template</FormLabel>
                          <Select 
                            onValueChange={(val) => {
                              field.onChange(Number(val));
                              form.setValue("variables", {});
                            }} 
                            value={field.value ? String(field.value) : undefined}
                          >
                            <FormControl>
                              <SelectTrigger className={!field.value ? "text-muted-foreground" : ""}>
                                <SelectValue placeholder={isLoadingTemplates ? "Loading templates..." : "Select a template"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templates?.map(t => (
                                <SelectItem key={t.id} value={String(t.id)}>
                                  <div className="flex flex-col">
                                    <span>{t.name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">{t.category}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {deliveryMode === "telegram" && (
                      <FormField
                        control={form.control}
                        name="chatId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telegram Chat ID</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 123456789 or @username" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {deliveryMode === "email" && (
                      <FormField
                        control={form.control}
                        name="brandKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand Theme</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || undefined}
                            >
                              <FormControl>
                                <SelectTrigger className={!field.value ? "text-muted-foreground" : ""}>
                                  <SelectValue placeholder={isLoadingBrands ? "Loading brands..." : "Select a brand"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {brands?.map(b => (
                                  <SelectItem key={b.key} value={b.key}>
                                    <div className="flex flex-col">
                                      <span>{b.name}</span>
                                      <span className="text-[10px] text-muted-foreground uppercase">{b.category}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {deliveryMode === "email" && (
                      <FormField
                        control={form.control}
                        name="recipientEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="user@example.com" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {deliveryMode === "email" && (
                      <FormField
                        control={form.control}
                        name="emailSubject"
                        render={({ field }) => (
                          <FormItem className="col-span-full">
                            <FormLabel>Email Subject</FormLabel>
                            <FormControl>
                              <Input placeholder="Subject line..." {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                  </div>
                </CardContent>
              </Card>

              {requiredVariables.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Dynamic Variables
                    </CardTitle>
                    <CardDescription>This template requires specific data to render correctly.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {requiredVariables.map(variable => (
                        <FormField
                          key={variable}
                          control={form.control}
                          name={`variables.${variable}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-mono text-xs">{variable}</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={`Value for ${variable}`} 
                                  className="bg-background"
                                  {...field} 
                                  value={field.value || ""} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button type="submit" size="lg" disabled={isPending || !selectedTemplateId || (deliveryMode === "email" && !selectedBrandKey)} className="w-full text-lg font-bold tracking-wide h-14">
                {isPending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-5 w-5" />
                )}
                DISPATCH {deliveryMode.toUpperCase()}
              </Button>
            </form>
          </Form>
        </div>

        {/* Right Column: Live Preview */}
        <div className="lg:col-span-5 xl:col-span-4 h-[600px] lg:h-auto flex flex-col border rounded-xl overflow-hidden bg-muted/20">
          <div className="h-12 border-b bg-card flex items-center px-4 shrink-0 gap-2 text-sm font-semibold">
            {deliveryMode === "telegram" ? <MessageSquare className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            Rendered Output
          </div>
          <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center relative">
            
            {isPreviewPending && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {!selectedTemplateId || (deliveryMode === "email" && !selectedBrandKey) ? (
              <div className="text-muted-foreground text-sm text-center">
                Select a template {deliveryMode === "email" ? "and brand " : ""}to view preview
              </div>
            ) : (
              deliveryMode === "telegram" ? (
                <div className="w-full max-w-sm bg-card border shadow-sm rounded-2xl p-4 flex flex-col gap-3">
                  {previewHtml ? (
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none font-sans break-words whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: previewHtml.replace(/\n/g, '<br/>') }}
                    />
                  ) : (
                    <div className="text-muted-foreground text-sm italic">Failed to render preview.</div>
                  )}
                  
                  {selectedTemplate?.buttonLabel && (
                    <div className="mt-2 w-full pt-2 border-t">
                      <div className="w-full bg-primary/10 text-primary font-bold text-center text-sm py-2 rounded-lg cursor-not-allowed">
                        {selectedTemplate.buttonLabel}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full bg-white border shadow-sm rounded-xl overflow-hidden min-h-[400px]">
                  {previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      title="Email Preview"
                      className="w-full h-full min-h-[500px]"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm italic">
                      Failed to render preview.
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
