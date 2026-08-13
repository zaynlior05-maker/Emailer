import { Link, useLocation } from "wouter"
import { Send, LayoutDashboard, LayoutTemplate, History, Settings, Zap, Menu, X, Palette } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Templates", href: "/templates", icon: LayoutTemplate },
    { label: "Brands", href: "/brands", icon: Palette },
    { label: "Compose & Send", href: "/send", icon: Send },
    { label: "Delivery Logs", href: "/logs", icon: History },
  ]

  const NavLinks = () => (
    <>
      {navItems.map((item) => {
        const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
        return (
          <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground hidden md:flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border gap-2 text-sidebar-primary">
          <Zap className="h-6 w-6" />
          <span className="font-semibold tracking-wide text-sidebar-foreground">TX-ENGINE</span>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors cursor-pointer rounded-md hover:bg-sidebar-accent">
            <Settings className="h-4 w-4" />
            Workspace Settings
          </div>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="h-16 border-b bg-sidebar text-sidebar-foreground flex items-center justify-between px-6 shrink-0 md:hidden">
          <div className="flex items-center gap-2 text-sidebar-primary font-semibold">
            <Zap className="h-5 w-5" />
            <span className="text-sidebar-foreground">TX-ENGINE</span>
          </div>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b bg-sidebar text-sidebar-foreground px-3 py-4 space-y-1">
            <NavLinks />
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
