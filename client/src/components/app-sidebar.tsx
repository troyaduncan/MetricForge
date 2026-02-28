import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Star, StarOff, Edit3, Trash2, Search,
  BarChart3, LineChart, AreaChart, ScatterChart,
  FolderOpen, Flame,
} from "lucide-react";
import type { MetricQuery } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AppSidebarProps {
  onSelectQuery: (query: MetricQuery) => void;
  onEditQuery: (query: MetricQuery) => void;
  selectedId?: string;
}

const vizIcons: Record<string, React.ReactNode> = {
  line: <LineChart className="w-3 h-3" />,
  area: <AreaChart className="w-3 h-3" />,
  bar: <BarChart3 className="w-3 h-3" />,
  scatter: <ScatterChart className="w-3 h-3" />,
};

export function AppSidebar({ onSelectQuery, onEditQuery, selectedId }: AppSidebarProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const { data: queries = [], isLoading } = useQuery<MetricQuery[]>({
    queryKey: ["/api/queries"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/queries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queries"] });
      toast({ title: "Query deleted" });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      await apiRequest("PATCH", `/api/queries/${id}`, { isFavorite: !isFavorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/queries"] });
    },
  });

  const filterFn = (q: MetricQuery) =>
    q.name.toLowerCase().includes(search.toLowerCase()) ||
    q.metricName.toLowerCase().includes(search.toLowerCase());

  const favorites = queries.filter((q) => q.isFavorite).filter(filterFn);
  const others = queries.filter((q) => !q.isFavorite).filter(filterFn);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Flame className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold tracking-tight">MetricForge</h1>
            <p className="text-[10px] text-muted-foreground">Prometheus Builder</p>
          </div>
        </div>
        <div className="relative px-2">
          <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search queries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
            data-testid="input-search-queries"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : (
          <>
            {favorites.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel>Favorites</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {favorites.map((q) => (
                      <QueryMenuItem
                        key={q.id}
                        query={q}
                        isSelected={selectedId === q.id}
                        onSelect={onSelectQuery}
                        onEdit={onEditQuery}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onToggleFavorite={(id, curr) => favoriteMutation.mutate({ id, isFavorite: curr })}
                      />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup>
              <SidebarGroupLabel>
                <div className="flex items-center justify-between gap-1 w-full">
                  <span>{favorites.length > 0 ? "All Queries" : "Saved Queries"}</span>
                  <Badge variant="secondary" className="text-[9px] h-4">{queries.length}</Badge>
                </div>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {others.length > 0 ? (
                    others.map((q) => (
                      <QueryMenuItem
                        key={q.id}
                        query={q}
                        isSelected={selectedId === q.id}
                        onSelect={onSelectQuery}
                        onEdit={onEditQuery}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onToggleFavorite={(id, curr) => favoriteMutation.mutate({ id, isFavorite: curr })}
                      />
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center px-4">
                      <FolderOpen className="w-7 h-7 text-muted-foreground/40 mb-2" />
                      <p className="text-xs text-muted-foreground">
                        {search ? "No queries match" : "No saved queries yet"}
                      </p>
                    </div>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Connected
          </div>
          <Badge variant="secondary" className="text-[9px]">v1.0</Badge>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function QueryMenuItem({
  query,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  query: MetricQuery;
  isSelected: boolean;
  onSelect: (q: MetricQuery) => void;
  onEdit: (q: MetricQuery) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isSelected}
        onClick={() => onSelect(query)}
        className="h-auto py-2"
        data-testid={`card-query-${query.id}`}
      >
        <div className="flex flex-col gap-1 w-full min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: query.color }} />
            <span className="text-sm font-medium truncate">{query.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[9px] h-4">{query.metricType}</Badge>
            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
              {vizIcons[query.visualizationType]}
            </span>
            {query.aggregation && (
              <Badge variant="outline" className="text-[9px] h-4 font-mono">{query.aggregation}()</Badge>
            )}
          </div>
        </div>
      </SidebarMenuButton>
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0 opacity-0 group-hover/menu-item:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(query.id, query.isFavorite); }}
              data-testid={`button-favorite-${query.id}`}
            >
              {query.isFavorite ? <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" /> : <StarOff className="w-2.5 h-2.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{query.isFavorite ? "Unfavorite" : "Favorite"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              onClick={(e) => { e.stopPropagation(); onEdit(query); }}
              data-testid={`button-edit-${query.id}`}
            >
              <Edit3 className="w-2.5 h-2.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              onClick={(e) => { e.stopPropagation(); onDelete(query.id); }}
              data-testid={`button-delete-${query.id}`}
            >
              <Trash2 className="w-2.5 h-2.5 text-destructive" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </SidebarMenuItem>
  );
}
