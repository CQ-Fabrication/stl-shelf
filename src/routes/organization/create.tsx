import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AlertCircle, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { RouterAppContext } from '../__root'

export const Route = createFileRoute('/organization/create')({
  component: CreateOrganizationPage,
})

function CreateOrganizationPage() {
  const navigate = useNavigate()
  const { auth } = Route.useRouteContext() as RouterAppContext

  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [hasExistingOrg, setHasExistingOrg] = useState(false)
  const [isCheckingOrgs, setIsCheckingOrgs] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm({
    defaultValues: {
      name: '',
      website: '',
    },
    onSubmit: async ({ value }) => {
      await handleCreateOrganization(value.name, value.website)
    },
  })

  useEffect(() => {
    checkExistingOrganizations()
  }, [])

  async function checkExistingOrganizations() {
    try {
      const { data: organizations } = await auth.organization.list()
      if (organizations && organizations.length > 0) {
        setHasExistingOrg(true)
      }
    } catch (error) {
      console.error('Failed to check organizations:', error)
    } finally {
      setIsCheckingOrgs(false)
    }
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo must be less than 5MB')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      setLogoFile(file)

      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  function removeLogo() {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleCreateOrganization(name: string, website: string) {
    if (!name.trim()) {
      toast.error('Organization name is required')
      return
    }

    setIsCreating(true)

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    let logoDataUrl: string | undefined
    if (logoFile) {
      logoDataUrl = logoPreview || undefined
    }

    const { error } = await auth.organization.create({
      name: name.trim(),
      slug,
      logo: logoDataUrl,
      metadata: website ? { website } : undefined,
    })

    if (error) {
      console.error('Failed to create organization:', error)

      if (
        error.code === 'YOU_HAVE_REACHED_THE_MAXIMUM_NUMBER_OF_ORGANIZATIONS' ||
        error.message?.includes('maximum number of organizations')
      ) {
        toast.error(
          'Organization limit reached. Currently, only one organization per user is supported.'
        )
        await navigate({ to: '/' })
      } else {
        toast.error(
          error.message || 'Failed to create organization. Please try again.'
        )
      }
      setIsCreating(false)
      return
    }

    toast.success('Organization created successfully')
    setIsCreating(false)

    await navigate({ to: '/' })
  }

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4">
        {!isCheckingOrgs && hasExistingOrg && (
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-amber-800 dark:text-amber-400">
              Organization Limit Reached
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              You have already created an organization. We're working hard to
              add support for multiple organizations, enhanced collaboration
              tools, and much more!
              <br />
              <br />
              <Button
                className="border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
                onClick={() => navigate({ to: '/' })}
                size="sm"
                variant="outline"
              >
                Return to Dashboard
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create Your Organization</CardTitle>
            <CardDescription>
              {hasExistingOrg
                ? 'You already have an organization. Currently, only one organization per user is supported.'
                : 'You need to create an organization to start managing your 3D models.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
            >
              <form.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Organization Name{' '}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      
                      disabled={isCreating || hasExistingOrg}
                      id="name"
                      onBlur={field.handleBlur}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        field.handleChange(e.target.value)
                      }
                      placeholder="My Organization"
                      required
                      type="text"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="website">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor="website">
                      Website{' '}
                      <span className="text-muted-foreground text-sm">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      disabled={isCreating || hasExistingOrg}
                      id="website"
                      onBlur={field.handleBlur}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        field.handleChange(e.target.value)
                      }
                      placeholder="https://example.com"
                      type="url"
                      value={field.state.value}
                    />
                  </div>
                )}
              </form.Field>

              <div className="space-y-2">
                <Label htmlFor="logo">
                  Logo{' '}
                  <span className="text-muted-foreground text-sm">
                    (optional)
                  </span>
                </Label>

                {logoPreview ? (
                  <div className="relative">
                    <div className="flex items-center justify-center rounded-lg border bg-muted/50 p-4">
                      <img
                        alt="Organization logo preview"
                        className="max-h-32 max-w-full object-contain"
                        height={128}
                        src={logoPreview}
                        width={128}
                      />
                    </div>
                    <Button
                      className="absolute top-2 right-2"
                      onClick={removeLogo}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-center">
                    <label
                      className={`flex h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 transition-colors ${hasExistingOrg ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-muted/70'}`}
                      htmlFor="logo"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">
                          Click to upload logo
                        </p>
                        <p className="text-muted-foreground text-xs">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                      <input
                        accept="image/*"
                        className="hidden"
                        disabled={isCreating || hasExistingOrg}
                        id="logo"
                        onChange={handleLogoSelect}
                        ref={fileInputRef}
                        type="file"
                      />
                    </label>
                  </div>
                )}
              </div>

              <form.Subscribe selector={(state) => state.values.name}>
                {(name) => (
                  <Button
                    className="w-full"
                    disabled={isCreating || !name.trim() || hasExistingOrg}
                    type="submit"
                  >
                    {(() => {
                      if (hasExistingOrg) return 'Limit Reached'
                      if (isCreating) return 'Creating...'
                      return 'Create Organization'
                    })()}
                  </Button>
                )}
              </form.Subscribe>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
