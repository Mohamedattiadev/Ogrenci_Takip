import { Sidebar } from '@/components/dashboard/sidebar';
import { SidebarProvider } from '@/components/dashboard/sidebar-context';
import { TopBar } from '@/components/dashboard/topbar';

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <SidebarProvider>
      <div className="flex h-screen bg-surface-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
