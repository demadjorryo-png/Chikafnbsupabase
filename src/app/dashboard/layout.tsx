import { FloatingStoreIndicator } from "@/components/dashboard/floating-store-indicator";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        {children}
        <FloatingStoreIndicator />
      </div>
    </SidebarProvider>
  );
}
