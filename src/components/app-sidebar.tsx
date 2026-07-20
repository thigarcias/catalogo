"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { CategoryNode } from "@/lib/types";
import { CategoryDialog } from "@/components/category-dialog";
import { ModelConfigDialog } from "@/components/model-config-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";

function CategoryBranch({
  node,
  activeId,
  depth = 0,
}: {
  node: CategoryNode;
  activeId?: string;
  depth?: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <SidebarMenuItem>
      <div className="flex items-center gap-0.5">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Recolher" : "Expandir"}
            aria-expanded={open}
            className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent"
          >
            <ChevronRight
              className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="size-5 shrink-0" />
        )}

        <SidebarMenuButton
          asChild
          isActive={activeId === node.id}
          className="flex-1"
        >
          <Link href={`/c/${node.id}`}>
            <span className="truncate">{node.name}</span>
          </Link>
        </SidebarMenuButton>
      </div>

      {hasChildren && open && (
        <SidebarMenuSub className="mr-0 pr-0">
          {node.children.map((child) => (
            <CategoryBranch
              key={child.id}
              node={child}
              activeId={activeId}
              depth={depth + 1}
            />
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar({ tree }: { tree: CategoryNode[] }) {
  const params = useParams<{ id?: string }>();
  const activeId = params?.id;

  return (
    <Sidebar>
      <SidebarHeader className="px-3 py-3">
        <ModelConfigDialog />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Categorias</SidebarGroupLabel>

          <CategoryDialog
            trigger={
              <SidebarGroupAction title="Nova categoria">
                <Plus className="size-4" />
              </SidebarGroupAction>
            }
          />

          <SidebarMenu>
            {tree.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Nenhuma categoria ainda.
              </p>
            )}
            {tree.map((node) => (
              <CategoryBranch key={node.id} node={node} activeId={activeId} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  );
}
