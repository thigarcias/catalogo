import { createClient } from "@/lib/supabase/server";
import { buildTree, type Category } from "@/lib/types";
import { AppSidebar } from "@/components/app-sidebar";
import { CatalogChat } from "@/components/catalog-chat";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("position");

  const tree = buildTree((data ?? []) as Category[]);

  return (
    <SidebarProvider>
      <AppSidebar tree={tree} />
      <SidebarInset>{children}</SidebarInset>
      <CatalogChat />
    </SidebarProvider>
  );
}
