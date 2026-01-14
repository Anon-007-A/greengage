import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Leaf, 
  Bell, 
  Search, 
  Moon, 
  Sun,
  Menu,
  ChevronLeft,
  Activity,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useGreenGaugeStore } from '@/store/useGreenGaugeStore';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import NotificationCenter from '@/components/notifications/NotificationCenter';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Portfolio', icon: LayoutDashboard },
  { path: '/simulator', label: 'Simulator', icon: Activity },
  { path: '/reports', label: 'Reports', icon: FileText },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { 
    sidebarCollapsed, 
    toggleSidebar, 
    darkMode, 
    toggleDarkMode, 
    searchQuery, 
    setSearchQuery,
    resetSearch,
    getUnreadNotificationCount 
  } = useGreenGaugeStore();

  const unreadCount = getUnreadNotificationCount();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop only */}
      {!isMobile && (
      <aside 
        className={cn(
          "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-40 transition-all duration-300 ease-in-out flex flex-col",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
              <Leaf className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-display text-lg font-bold text-sidebar-foreground animate-fade-in">
                GreenGauge
              </span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === '/dashboard' && location.pathname.startsWith('/loan/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 min-h-12",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="font-medium animate-fade-in">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Button */}
        <div className="p-3 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground min-h-12"
          >
            <ChevronLeft className={cn(
              "w-5 h-5 transition-transform duration-300",
              sidebarCollapsed && "rotate-180"
            )} />
          </Button>
        </div>
      </aside>
      )}

      {/* Mobile Menu Sheet */}
      {isMobile && (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader>
              <SheetTitle className="p-4 text-left flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                GreenGauge
              </SheetTitle>
            </SheetHeader>
            <nav className="space-y-2 p-4">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path === '/dashboard' && location.pathname.startsWith('/loan/'));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-12",
                      isActive 
                        ? "bg-teal-600 text-white" 
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div className={cn(
        "flex-1 transition-all duration-300",
        !isMobile && !sidebarCollapsed ? "ml-64" : !isMobile && sidebarCollapsed ? "ml-16" : "ml-0"
      )}>
        {/* Header - Dark Gradient */}
        <header 
          className="h-20 border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 md:px-6"
          style={{
            background: 'linear-gradient(135deg, #0D5C4C 0%, #06A77D 100%)',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          <div className="flex items-center gap-3 md:gap-6 flex-1">
            {/* Mobile Menu Button */}
            {isMobile && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-white/10 min-h-12 min-w-12"
                  >
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader>
                    <SheetTitle className="p-4 text-left flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                        <Leaf className="w-5 h-5 text-white" />
                      </div>
                      GreenGauge
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="space-y-2 p-4">
                    {navItems.map((item) => {
                      const isActive = location.pathname === item.path || 
                        (item.path === '/dashboard' && location.pathname.startsWith('/loan/'));
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 min-h-12",
                            isActive 
                              ? "bg-teal-600 text-white" 
                              : "text-gray-700 hover:bg-gray-100"
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            
            {/* Logo + Title */}
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 md:w-10 h-8 md:h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <Leaf className="w-5 md:w-6 h-5 md:h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-white font-bold text-lg md:text-2xl leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                  GreenGauge | LMA Intelligence
                </h1>
                <p className="text-white/80 text-xs md:text-sm hidden md:block" style={{ fontSize: '14px' }}>
                  Covenant monitoring & ESG analytics
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Search - Hidden on mobile */}
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70" />
              <Input
                placeholder="Search loans..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm"
                style={{ color: 'white' }}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => resetSearch()}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-white/80"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Notifications */}
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative text-white hover:bg-white/10 min-h-12 min-w-12"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="font-display">Notifications</SheetTitle>
                </SheetHeader>
                <NotificationCenter />
              </SheetContent>
            </Sheet>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="text-white hover:bg-white/10 min-h-12 min-w-12"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="animate-fade-in" style={{ 
          backgroundColor: '#F9FAFB',
          padding: 'clamp(16px, 5vw, 40px)',
          minHeight: 'calc(100vh - 80px)'
        }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
