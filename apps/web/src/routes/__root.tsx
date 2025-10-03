import { createRootRoute, Outlet, Scripts } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import "../index.css";

export const Route = createRootRoute({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "STL Shelf - Organize Your 3D Printing Library",
      },
      {
        name: "description",
        content:
          "The modern way to organize, version, and manage your 3D printable models",
      },
    ],
  }),
});

function RootComponent() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      storageKey="web-ui-theme"
    >
      <div className="min-h-screen bg-background">
        <Outlet />
        <Scripts />
      </div>
    </ThemeProvider>
  );
}
