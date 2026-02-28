import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Edit3, Trash2, Database, Globe, Shield, Clock,
  CheckCircle2, Server, Zap,
} from "lucide-react";
import type { Datasource } from "@shared/schema";
import { ContextualHelpTip } from "@/components/help-panel";

const datasourceFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1),
  url: z.string().min(1, "URL is required").url("Must be a valid URL"),
  access: z.string().min(1),
  basicAuth: z.boolean(),
  basicAuthUser: z.string().optional(),
  isDefault: z.boolean(),
  scrapeInterval: z.string().optional(),
  queryTimeout: z.string().optional(),
  httpMethod: z.string().optional(),
});

type DatasourceFormValues = z.infer<typeof datasourceFormSchema>;

const defaultFormValues: DatasourceFormValues = {
  name: "",
  type: "prometheus",
  url: "",
  access: "proxy",
  basicAuth: false,
  basicAuthUser: "",
  isDefault: false,
  scrapeInterval: "15s",
  queryTimeout: "60s",
  httpMethod: "POST",
};

export function DatasourceManager() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDs, setEditingDs] = useState<Datasource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: datasourcesList = [], isLoading } = useQuery<Datasource[]>({
    queryKey: ["/api/datasources"],
  });

  const form = useForm<DatasourceFormValues>({
    resolver: zodResolver(datasourceFormSchema),
    defaultValues: defaultFormValues,
  });

  const createMutation = useMutation({
    mutationFn: async (ds: DatasourceFormValues) => {
      const res = await apiRequest("POST", "/api/datasources", ds);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasources"] });
      toast({ title: "Datasource created", description: "Prometheus datasource has been added." });
      setDialogOpen(false);
      form.reset(defaultFormValues);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DatasourceFormValues }) => {
      const res = await apiRequest("PATCH", `/api/datasources/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasources"] });
      toast({ title: "Datasource updated" });
      setDialogOpen(false);
      setEditingDs(null);
      form.reset(defaultFormValues);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/datasources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/datasources"] });
      toast({ title: "Datasource deleted" });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleOpenCreate = () => {
    setEditingDs(null);
    form.reset(defaultFormValues);
    setDialogOpen(true);
  };

  const handleOpenEdit = (ds: Datasource) => {
    setEditingDs(ds);
    form.reset({
      name: ds.name,
      type: ds.type,
      url: ds.url,
      access: ds.access,
      basicAuth: ds.basicAuth,
      basicAuthUser: ds.basicAuthUser || "",
      isDefault: ds.isDefault,
      scrapeInterval: ds.scrapeInterval || "15s",
      queryTimeout: ds.queryTimeout || "60s",
      httpMethod: ds.httpMethod || "POST",
    });
    setDialogOpen(true);
  };

  const handleSubmit = form.handleSubmit((values) => {
    if (editingDs) {
      updateMutation.mutate({ id: editingDs.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight mb-1">Datasources</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            Configure Prometheus datasource connections for your metric queries.
            <ContextualHelpTip content="Datasources represent connections to Prometheus-compatible backends (Prometheus, Thanos, Cortex, Mimir, VictoriaMetrics). Add them here and associate them with your queries in the Builder tab." />
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="gap-1.5"
          data-testid="button-add-datasource"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Datasource
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : datasourcesList.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/50 flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-base font-semibold mb-1">No datasources configured</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            Add a Prometheus datasource to connect your metric queries to a real or simulated data endpoint.
          </p>
          <Button onClick={handleOpenCreate} className="gap-1.5" data-testid="button-add-datasource-empty">
            <Plus className="w-3.5 h-3.5" />
            Add Datasource
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datasourcesList.map((ds) => (
            <DatasourceCard
              key={ds.id}
              datasource={ds}
              onEdit={() => handleOpenEdit(ds)}
              onDelete={() => setDeleteId(ds.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingDs(null); form.reset(defaultFormValues); } }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              {editingDs ? "Edit Datasource" : "Add Datasource"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Production Prometheus" className="h-9 text-sm" data-testid="input-ds-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm" data-testid="select-ds-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="prometheus">Prometheus</SelectItem>
                          <SelectItem value="thanos">Thanos</SelectItem>
                          <SelectItem value="cortex">Cortex</SelectItem>
                          <SelectItem value="mimir">Mimir</SelectItem>
                          <SelectItem value="victoriametrics">VictoriaMetrics</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="access"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Access</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm" data-testid="select-ds-access">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="proxy">Server (proxy)</SelectItem>
                          <SelectItem value="direct">Browser (direct)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">URL</FormLabel>
                    <FormControl>
                      <Input placeholder="http://prometheus:9090" className="h-9 text-sm font-mono" data-testid="input-ds-url" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="scrapeInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Scrape interval</FormLabel>
                      <FormControl>
                        <Input placeholder="15s" className="h-9 text-sm font-mono" data-testid="input-ds-scrape" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="queryTimeout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Query timeout</FormLabel>
                      <FormControl>
                        <Input placeholder="60s" className="h-9 text-sm font-mono" data-testid="input-ds-timeout" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="httpMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">HTTP Method</FormLabel>
                      <Select value={field.value || "POST"} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm" data-testid="select-ds-method">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="GET">GET</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between border rounded-md p-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs font-medium">Basic Auth</Label>
                    <p className="text-[10px] text-muted-foreground">Enable HTTP basic authentication</p>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="basicAuth"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-ds-basic-auth"
                      />
                    </FormControl>
                  )}
                />
              </div>

              {form.watch("basicAuth") && (
                <FormField
                  control={form.control}
                  name="basicAuthUser"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Basic Auth User</FormLabel>
                      <FormControl>
                        <Input placeholder="Username" className="h-9 text-sm" data-testid="input-ds-auth-user" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <div className="flex items-center justify-between border rounded-md p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs font-medium">Default</Label>
                    <p className="text-[10px] text-muted-foreground">Set as default datasource for new queries</p>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-ds-default"
                      />
                    </FormControl>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-ds-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} data-testid="button-ds-save">
                  {isSaving ? "Saving..." : editingDs ? "Update" : "Add Datasource"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete datasource?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this datasource. Queries using it will no longer have an associated datasource.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-ds-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-ds-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DatasourceCard({
  datasource,
  onEdit,
  onDelete,
}: {
  datasource: Datasource;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeColors: Record<string, string> = {
    prometheus: "text-orange-500",
    thanos: "text-blue-500",
    cortex: "text-purple-500",
    mimir: "text-cyan-500",
    victoriametrics: "text-green-500",
  };

  return (
    <Card className="p-4 border-accent" data-testid={`card-datasource-${datasource.id}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center shrink-0">
            <Server className={`w-5 h-5 ${typeColors[datasource.type] || "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{datasource.name}</h3>
              {datasource.isDefault && (
                <Badge className="text-[9px] h-4 px-1.5" data-testid={`badge-default-${datasource.id}`}>default</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] capitalize">{datasource.type}</Badge>
              <Badge variant="outline" className="text-[10px]">{datasource.access}</Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            data-testid={`button-edit-ds-${datasource.id}`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            data-testid={`button-delete-ds-${datasource.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono text-muted-foreground truncate">{datasource.url}</span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Scrape: {datasource.scrapeInterval || "15s"}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Timeout: {datasource.queryTimeout || "60s"}
          </span>
          <span className="flex items-center gap-1">
            Method: {datasource.httpMethod || "POST"}
          </span>
        </div>

        {datasource.basicAuth && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <Shield className="w-3 h-3 text-amber-500" />
            <span className="text-muted-foreground">Basic auth enabled</span>
            {datasource.basicAuthUser && (
              <span className="font-mono text-muted-foreground">({datasource.basicAuthUser})</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
