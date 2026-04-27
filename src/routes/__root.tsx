import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card max-w-md p-10 text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page drifted off into the void.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CampusFinance — Smart finance for college students" },
      { name: "description", content: "Track expenses, set budgets, split outings and master your money — built for Indian college students." },
      { name: "theme-color", content: "#1a0d33" },
      { property: "og:title", content: "CampusFinance — Smart finance for college students" },
      { property: "og:description", content: "Track expenses, set budgets, split outings and master your money — built for Indian college students." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "CampusFinance — Smart finance for college students" },
      { name: "twitter:description", content: "Track expenses, set budgets, split outings and master your money — built for Indian college students." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1941e9a9-2dfb-4836-8b2c-056d35104b93/id-preview-63aca7f9--d8ef30d9-8b54-40e1-8390-91daf3a68753.lovable.app-1777279085607.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1941e9a9-2dfb-4836-8b2c-056d35104b93/id-preview-63aca7f9--d8ef30d9-8b54-40e1-8390-91daf3a68753.lovable.app-1777279085607.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-right" theme="dark" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
}
