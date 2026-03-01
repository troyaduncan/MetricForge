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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Edit3, Trash2, Database, Globe, Shield, Clock,
  CheckCircle2, Server, Zap, Lock, ShieldAlert, KeyRound, FileKey,
  Plug, Loader2, CheckCircle, XCircle,
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
  tlsClientAuth: z.boolean(),
  tlsSkipVerify: z.boolean(),
  tlsCaCert: z.string().optional(),
  tlsClientCert: z.string().optional(),
  tlsClientKey: z.string().optional(),
  tlsServerName: z.string().optional(),
}).refine((data) => {
  if (data.tlsClientAuth) {
    return !!data.tlsClientCert && data.tlsClientCert.trim().length > 0;
  }
  return true;
}, { message: "Client certificate is required when TLS client auth is enabled", path: ["tlsClientCert"] })
.refine((data) => {
  if (data.tlsClientAuth) {
    return !!data.tlsClientKey && data.tlsClientKey.trim().length > 0;
  }
  return true;
}, { message: "Client key is required when TLS client auth is enabled", path: ["tlsClientKey"] });

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
  tlsClientAuth: false,
  tlsSkipVerify: false,
  tlsCaCert: "",
  tlsClientCert: "",
  tlsClientKey: "",
  tlsServerName: "",
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

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; latencyMs?: number } | null>(null);

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      setTestingId(id);
      setTestResult(null);
      const res = await apiRequest("POST", `/api/datasources/${id}/test`);
      return res.json();
    },
    onSuccess: (data: any, id: string) => {
      setTestingId(null);
      setTestResult({ id, success: data.success, message: data.message, latencyMs: data.latencyMs });
      if (data.success) {
        toast({ title: "Connection successful", description: `${data.message}${data.latencyMs ? ` (${data.latencyMs}ms)` : ""}${data.version ? ` — v${data.version}` : ""}` });
      } else {
        toast({ title: "Connection failed", description: data.message, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      setTestingId(null);
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
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
      tlsClientAuth: ds.tlsClientAuth ?? false,
      tlsSkipVerify: ds.tlsSkipVerify ?? false,
      tlsCaCert: ds.tlsCaCert || "",
      tlsClientCert: ds.tlsClientCert || "",
      tlsClientKey: ds.tlsClientKey || "",
      tlsServerName: ds.tlsServerName || "",
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
              onTest={() => testMutation.mutate(ds.id)}
              isTesting={testingId === ds.id}
              testResult={testResult?.id === ds.id ? testResult : null}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingDs(null); form.reset(defaultFormValues); } }}>
        <DialogContent className="sm:max-w-[540px] max-h-[85vh] overflow-y-auto">
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

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold">TLS / SSL Settings</span>
                </div>

                <div className="flex items-center justify-between border rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs font-medium">TLS Client Authentication</Label>
                      <p className="text-[10px] text-muted-foreground">Enable client certificate authentication</p>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="tlsClientAuth"
                    render={({ field }) => (
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-ds-tls-client-auth"
                        />
                      </FormControl>
                    )}
                  />
                </div>

                <div className="flex items-center justify-between border rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs font-medium">Skip TLS Verify</Label>
                      <p className="text-[10px] text-muted-foreground">Skip server certificate verification (insecure)</p>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="tlsSkipVerify"
                    render={({ field }) => (
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-ds-tls-skip-verify"
                        />
                      </FormControl>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tlsServerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Server Name (SNI)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., prometheus.example.com" className="h-9 text-sm font-mono" data-testid="input-ds-tls-server-name" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tlsCaCert"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs flex items-center gap-1.5">
                        <FileKey className="w-3.5 h-3.5" />
                        CA Certificate
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                          className="text-xs font-mono min-h-[80px] resize-y"
                          data-testid="textarea-ds-tls-ca-cert"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("tlsClientAuth") && (
                  <>
                    <FormField
                      control={form.control}
                      name="tlsClientCert"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs flex items-center gap-1.5">
                            <FileKey className="w-3.5 h-3.5" />
                            Client Certificate
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                              className="text-xs font-mono min-h-[80px] resize-y"
                              data-testid="textarea-ds-tls-client-cert"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tlsClientKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs flex items-center gap-1.5">
                            <FileKey className="w-3.5 h-3.5" />
                            Client Key
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                              className="text-xs font-mono min-h-[80px] resize-y"
                              data-testid="textarea-ds-tls-client-key"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              <Separator />

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
  onTest,
  isTesting,
  testResult,
}: {
  datasource: Datasource;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  isTesting: boolean;
  testResult: { success: boolean; message: string; latencyMs?: number } | null;
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
            onClick={onTest}
            disabled={isTesting}
            data-testid={`button-test-ds-${datasource.id}`}
          >
            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />}
          </Button>
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

        {(datasource.tlsClientAuth || datasource.tlsSkipVerify || datasource.tlsCaCert) && (
          <div className="flex items-center gap-2 text-[10px] flex-wrap">
            <Lock className="w-3 h-3 text-blue-500 shrink-0" />
            {datasource.tlsClientAuth && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5">
                <KeyRound className="w-2.5 h-2.5" />
                Client Auth
              </Badge>
            )}
            {datasource.tlsSkipVerify && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5 border-amber-400 text-amber-600 dark:text-amber-400">
                <ShieldAlert className="w-2.5 h-2.5" />
                Skip Verify
              </Badge>
            )}
            {datasource.tlsCaCert && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5">
                <FileKey className="w-2.5 h-2.5" />
                CA Cert
              </Badge>
            )}
            {datasource.tlsClientCert && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5">
                <FileKey className="w-2.5 h-2.5" />
                Client Cert
              </Badge>
            )}
            {datasource.tlsServerName && (
              <span className="font-mono text-muted-foreground">SNI: {datasource.tlsServerName}</span>
            )}
          </div>
        )}

        {testResult && (
          <div className={`flex items-center gap-2 text-xs p-2 rounded-md ${testResult.success ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"}`} data-testid={`test-result-${datasource.id}`}>
            {testResult.success ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{testResult.message}</span>
            {testResult.latencyMs && <span className="text-[10px] ml-auto shrink-0">{testResult.latencyMs}ms</span>}
          </div>
        )}

        {isTesting && (
          <div className="flex items-center gap-2 text-xs p-2 rounded-md bg-accent/50 text-muted-foreground" data-testid={`test-loading-${datasource.id}`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>Testing connection to {datasource.url}...</span>
          </div>
        )}
      </div>
    </Card>
  );
}
