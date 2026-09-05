import AppSidebar from "@/components/shell/AppSidebar";
import AppTopbar from "@/components/shell/AppTopbar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300">
        <AppTopbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}
