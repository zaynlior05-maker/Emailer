import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useGetTemplate, 
  getGetTemplateQueryKey, 
  useCreateTemplate, 
  useUpdateTemplate, 
  useDeleteTemplate,
  TemplateInputTheme,
  TemplateInputCategory
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Loader2, Trash2, Eye } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/components/ui/use-toast";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  theme: z.enum([TemplateInputTheme.minimalist, TemplateInputTheme['high-priority'], TemplateInputTheme.custom]),
  category: z.enum([TemplateInputCategory.banking, TemplateInputCategory.crypto, TemplateInputCategory.ecommerce, TemplateInputCategory.support, TemplateInputCategory.custom]),
  content: z.string().min(1, "Content is required"),
  buttonLabel: z.string().optional(),
  buttonUrl: z.string().optional(),
  description: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

export default function TemplateForm() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const isNew = !params.id || params.id === "new";
  const templateId = isNew ? null : Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: template, isLoading: isLoadingTemplate } = useGetTemplate(templateId as number, { 
    query: { 
      enabled: !!templateId, 
      queryKey: getGetTemplateQueryKey(templateId as number) 
    } 
  });

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      theme: TemplateInputTheme.minimalist,
      category: TemplateInputCategory.custom,
      content: "",
      buttonLabel: "",
      buttonUrl: "",
      description: "",
    },
  });

  // Watch for preview
  const formContent = form.watch("content");
  
  const initialized = useRef(false);
  useEffect(() => {
    if (template && !initialized.current) {
      form.reset({
        name: template.name,
        theme: template.theme as any,
        category: template.category as any,
        content: template.content,
        buttonLabel: template.buttonLabel || "",
        buttonUrl: template.buttonUrl || "",
        description: template.description || "",
      });
      initialized.current = true;
    }
  }, [template, form]);

  const onSubmit = (data: TemplateFormValues) => {
    const payload = {
      ...data,
      buttonLabel: data.buttonLabel || undefined,
      buttonUrl: data.buttonUrl || undefined,
      description: data.description || undefined,
    };

    if (isNew) {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => {
          toast({ title: "Template created successfully" });
          setLocation("/templates");
        },
        onError: () => {
          toast({ title: "Failed to create template", variant: "destructive" });
        }
      });
    } else {
      updateMutation.mutate({ id: templateId!, data: payload }, {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetTemplateQueryKey(templateId!), updated);
          toast({ title: "Template updated successfully" });
          setLocation("/templates");
        },
        onError: () => {
          toast({ title: "Failed to update template", variant: "destructive" });
        }
      });
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate({ id: templateId! }, {
        onSuccess: () => {
          toast({ title: "Template deleted" });
          setLocation("/templates");
        },
        onError: () => {
          toast({ title: "Failed to delete template", variant: "destructive" });
        }
      });
    }
  };

  if (isLoadingTemplate && !isNew) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-8 max-w-[1600px] mx-auto flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <Link href="/templates" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{isNew ? "New Template" : "Edit Template"}</h1>
          <p className="text-muted-foreground text-sm">{isNew ? "Create a new message format" : "Modify existing message format"}</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
        <div className="overflow-y-auto pr-2 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-full">
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Welcome Message" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(TemplateInputCategory).map(cat => (
                            <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theme</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a theme" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(TemplateInputTheme).map(theme => (
                            <SelectItem key={theme} value={theme} className="uppercase text-xs tracking-wide">
                              {theme.replace('-', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Internal)</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief note about when to use this" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-6 space-y-6">
                <h3 className="font-semibold text-lg">Message Content</h3>
                
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telegram HTML Content</FormLabel>
                      <FormDescription>
                        Use <code className="bg-muted px-1 py-0.5 rounded text-xs">&lt;b&gt;</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">&lt;i&gt;</code>, <code className="bg-muted px-1 py-0.5 rounded text-xs">&lt;code&gt;</code>, and variables like <code className="bg-muted px-1 py-0.5 rounded text-xs text-primary font-bold">{"{{variable_name}}"}</code>.
                      </FormDescription>
                      <FormControl>
                        <Textarea 
                          placeholder="<b>Hello {{name}}</b>, your code is {{code}}." 
                          className="font-mono h-[250px] resize-y bg-muted/30"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="buttonLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button Label (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. View Order" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="buttonUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Button URL (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://..." type="url" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-6 border-t">
                <Button type="submit" disabled={isPending} className="w-40 font-semibold tracking-wide">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isNew ? "Create Template" : "Save Changes"}
                </Button>
                
                {!isNew && (
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending} className="ml-auto">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Template
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>

        {/* Live Preview Panel */}
        <div className="flex flex-col border rounded-xl overflow-hidden bg-muted/10 h-full max-h-[800px]">
          <div className="h-12 border-b bg-muted/30 flex items-center px-4 shrink-0 gap-2 text-sm font-semibold text-muted-foreground">
            <Eye className="h-4 w-4" />
            Raw HTML Preview
          </div>
          <div className="p-6 overflow-y-auto flex-1 bg-background/50 flex flex-col items-center">
            {/* Telegram-like bubble */}
            <div className="w-full max-w-sm bg-card border rounded-2xl p-3 shadow-sm flex flex-col gap-2">
              {formContent ? (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none font-sans break-words whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formContent.replace(/\n/g, '<br/>') }}
                />
              ) : (
                <div className="text-muted-foreground text-sm italic">Content will appear here...</div>
              )}
              
              {form.watch('buttonLabel') && (
                <div className="mt-2 w-full pt-2 border-t">
                  <div className="w-full bg-primary/10 text-primary font-medium text-center text-sm py-2 rounded-lg cursor-pointer">
                    {form.watch('buttonLabel')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
