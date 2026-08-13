import { useListBrands, useDeleteBrand } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Palette, Shield } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { getListBrandsQueryKey } from "@workspace/api-client-react";

export default function BrandsList() {
  const { data: brands, isLoading } = useListBrands();
  const deleteBrand = useDeleteBrand();
  const queryClient = useQueryClient();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this brand?")) {
      deleteBrand.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBrandsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Palette className="h-8 w-8 text-primary" />
            Brand Themes
          </h1>
          <p className="text-muted-foreground mt-1">Manage brand configurations and email themes.</p>
        </div>
        <Link href="/brands/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2">
          <Plus className="h-4 w-4" />
          New Brand
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
          {brands?.map((brand) => (
            <Card key={brand.id} className="flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-xl line-clamp-1" title={brand.name}>
                    {brand.name}
                  </CardTitle>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="shrink-0 uppercase text-[10px] tracking-wider">
                      {brand.category.replace('_', ' ')}
                    </Badge>
                    <Badge variant="secondary" className="shrink-0 uppercase text-[10px] tracking-wider">
                      {brand.theme}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="font-mono text-xs">
                  Key: {brand.key}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Colors</span>
                  <div className="flex gap-2 items-center flex-wrap">
                    {[
                      { name: 'Primary', color: brand.primaryColor },
                      { name: 'Card', color: brand.cardBg },
                      { name: 'Body', color: brand.bodyBg }
                    ].map(c => (
                      <div key={c.name} className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border text-xs">
                        <div className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: c.color }} />
                        <span>{c.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t gap-2 justify-between">
                <span className="text-xs text-muted-foreground">
                  Added {format(new Date(brand.createdAt), 'MMM d, yyyy')}
                </span>
                <div className="flex gap-2">
                  <Link href={`/brands/${brand.id}/edit`} className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 border border-input">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(brand.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
          {brands?.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed rounded-xl bg-muted/20">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-bold">No brands found</h3>
              <p className="text-muted-foreground mb-4">Create your first brand theme.</p>
              <Link href="/brands/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                <Plus className="h-4 w-4 mr-2" />
                Create Brand
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
