# Architecture

STL Shelf is a TanStack Start unified application with file-based routes, server-side functions, and shared React components.

```
src/
├── routes/                    # File-based routing (TanStack Router)
│   ├── __root.tsx             # Root layout
│   ├── api/                   # API routes
│   │   └── auth/$.ts          # Better Auth handler
│   ├── organization/          # Organization routes
│   ├── checkout/              # Checkout routes
│   └── *.tsx                  # Page routes
├── server/                    # Server-side code
│   ├── functions/             # Server functions (createServerFn)
│   │   ├── models.ts          # Model CRUD operations
│   │   └── billing.ts         # Billing operations
│   ├── services/              # Business logic services
│   │   ├── models/            # Model-related services
│   │   ├── tags/              # Tag services
│   │   ├── billing/           # Polar/billing services
│   │   └── storage.ts         # R2 storage service
│   └── middleware/
│       └── auth.ts            # Auth middleware
├── components/                # React components
│   ├── ui/                    # shadcn/ui components
│   ├── models/                # Model-related components
│   ├── model-detail/          # Model detail page components
│   ├── billing/               # Billing components
│   └── *.tsx                  # Shared components
├── hooks/                     # Custom React hooks
├── lib/                       # Core libraries
│   ├── db/                    # Drizzle ORM
│   │   ├── index.ts           # Database client
│   │   └── schema/            # Database schema
│   │       ├── auth.ts        # Better Auth tables
│   │       ├── models.ts      # Model/file/tag tables
│   │       └── api-keys.ts    # API key tables
│   ├── auth.ts                # Better Auth configuration
│   ├── email/                 # Email templates (React Email)
│   ├── billing/               # Billing config and utilities
│   └── *.ts                   # Utility modules
├── stores/                    # State management (TanStack Store)
└── utils/                     # Utility functions
```
