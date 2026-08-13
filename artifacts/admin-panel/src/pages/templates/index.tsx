import { useListTemplates } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutTemplate, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function TemplatesList() {
  const { data: templates, isLoading } = useListTemplates();

  const getThemeBadgeVariant = (theme: string) => {
    switch (theme) {
      case 'high-priority': return 'destructive';
      case 'minimalist': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <LayoutTemplate className="h-8 w-8 text-primary" />
            Template Library
          </h1>
          <p className="text-muted-foreground mt-1">Manage and organize your message formats.</p>
        </div>
        <Link href="/templates/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {templates?.map((template) => (
            <Card key={template.id} className="flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-xl line-clamp-1" title={template.name}>
                    {template.name}
                  </CardTitle>
                  <Badge variant={getThemeBadgeVariant(template.theme)} className="shrink-0 uppercase text-[10px] tracking-wider">
                    {template.theme.replace('-', ' ')}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2 min-h-[40px]">
                  {template.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Category</span>
                  <Badge variant="outline" className="capitalize text-xs font-normal">
                    {template.category}
                  </Badge>
                </div>
                <div className="bg-muted/50 p-3 rounded-md border border-border/50 text-xs font-mono text-muted-foreground line-clamp-3">
                  {template.content}
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t gap-2 justify-between">
                <span className="text-xs text-muted-foreground">
                  Updated {format(new Date(template.updatedAt), 'MMM d, yyyy')}
                </span>
                <div className="flex gap-2">
                  <Link href={`/templates/${template.id}/edit`} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 border border-input">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ))}
          {templates?.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed rounded-xl bg-muted/20">
              <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold">No templates found</h3>
              <p className="text-muted-foreground mb-4">Create your first template to start sending messages.</p>
              <Link href="/templates/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
