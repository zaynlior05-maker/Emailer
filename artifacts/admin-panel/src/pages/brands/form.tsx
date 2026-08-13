import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateBrand,
  useUpdateBrand,
  useGetBrand,
  getGetBrandQueryKey,
  BrandInputCategory,
  BrandInputTheme
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const brandSchema = z.object({
  name: z.string().min(1, "Name is required"),
  key: z.string().min(1, "Key is required"),
  category: z.nativeEnum(BrandInputCategory),
  theme: z.nativeEnum(BrandInputTheme),
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Must be a valid hex color"),
  headerBg: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Must be a valid hex color").optional().or(z.literal("")),
  cardBg: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Must be a valid hex color"),
  bodyBg: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Must be a valid hex color"),
  textColor: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Must be a valid hex color"),
  accentBg: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, "Must be a valid hex color").optional().or(z.literal("")),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type BrandFormValues = z.infer<typeof brandSchema>;

const ColorInput = ({ field, label, description }: any) => (
  <FormItem>
    <FormLabel>{label}</FormLabel>
    {description && <FormDescription>{description}</FormDescription>}
    <FormControl>
      <div className="flex gap-2 items-center">
        <div 
          className="w-10 h-10 rounded-md border shadow-sm shrink-0" 
          style={{ backgroundColor: field.value || 'transparent' }}
        />
        <Input placeholder="#000000" {...field} />
      </div>
    </FormControl>
    <FormMessage />
  </FormItem>
);

export default function BrandForm() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isEdit = !!params.id && params.id !== "new";
  const brandId = isEdit ? parseInt(params.id as string, 10) : undefined;

  const { data: brand, isLoading: isLoadingBrand } = useGetBrand(brandId!, {
    query: {
      enabled: isEdit,
      queryKey: getGetBrandQueryKey(brandId!)
    }
  });

  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: "",
      key: "",
      category: BrandInputCategory.crypto,
      theme: BrandInputTheme.light,
      primaryColor: "#000000",
      cardBg: "#ffffff",
      bodyBg: "#f8f9fa",
      textColor: "#000000",
      headerBg: "",
      accentBg: "",
      logoUrl: "",
    },
  });

  useEffect(() => {
    if (brand && isEdit) {
      form.reset({
        name: brand.name,
        key: brand.key,
        category: brand.category as BrandInputCategory,
        theme: brand.theme as BrandInputTheme,
        primaryColor: brand.primaryColor,
        cardBg: brand.cardBg,
        bodyBg: brand.bodyBg,
        textColor: brand.textColor,
        headerBg: brand.headerBg || "",
        accentBg: brand.accentBg || "",
        logoUrl: brand.logoUrl || "",
      });
    }
  }, [brand, isEdit, form]);

  const onSubmit = (values: BrandFormValues) => {
    if (isEdit) {
      updateBrand.mutate(
        { id: brandId!, data: values },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetBrandQueryKey(brandId!) });
            toast({
              title: "Brand updated",
              description: "The brand has been successfully updated.",
            });
            setLocation("/brands");
          },
        }
      );
    } else {
      createBrand.mutate(
        { data: values },
        {
          onSuccess: () => {
            toast({
              title: "Brand created",
              description: "The new brand has been successfully created.",
            });
            setLocation("/brands");
          },
        }
      );
    }
  };

  if (isEdit && isLoadingBrand) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/brands")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Edit Brand" : "New Brand"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEdit ? "Update brand theme and settings." : "Configure a new brand identity."}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Details</CardTitle>
              <CardDescription>Brand identity and classification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key (Slug)</FormLabel>
                      <FormControl>
                        <Input placeholder="acme-corp" {...field} disabled={isEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(BrandInputCategory).map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat.replace('_', ' ').toUpperCase()}
                            </SelectItem>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a theme" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(BrandInputTheme).map((theme) => (
                            <SelectItem key={theme} value={theme}>
                              {theme.toUpperCase()}
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
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/logo.png" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>Hex color codes for email template rendering</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => <ColorInput field={field} label="Primary Color" />}
              />
              <FormField
                control={form.control}
                name="textColor"
                render={({ field }) => <ColorInput field={field} label="Text Color" />}
              />
              <FormField
                control={form.control}
                name="bodyBg"
                render={({ field }) => <ColorInput field={field} label="Body Background" />}
              />
              <FormField
                control={form.control}
                name="cardBg"
                render={({ field }) => <ColorInput field={field} label="Card Background" />}
              />
              <FormField
                control={form.control}
                name="headerBg"
                render={({ field }) => <ColorInput field={field} label="Header Background (Optional)" />}
              />
              <FormField
                control={form.control}
                name="accentBg"
                render={({ field }) => <ColorInput field={field} label="Accent Background (Optional)" />}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => setLocation("/brands")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBrand.isPending || updateBrand.isPending}>
              {createBrand.isPending || updateBrand.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEdit ? "Save Changes" : "Create Brand"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
