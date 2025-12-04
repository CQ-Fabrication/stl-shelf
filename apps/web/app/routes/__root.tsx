import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import appCss from "~/styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "STL Shelf - Organize Your 3D Printing Library" },
      {
        name: "description",
        content:
          "Self-hosted solution for managing your personal collection of 3D printable models. Version control, preview, and organize all your STL files in one place.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
})

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  )

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen flex flex-col bg-background">
            <Outlet />
          </div>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
