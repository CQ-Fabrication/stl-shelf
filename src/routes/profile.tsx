import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileCheck, Shield, Smartphone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConsentTab } from "@/components/profile/consent-tab";
import { ProfileTab } from "@/components/profile/profile-tab";
import { SecurityTab } from "@/components/profile/security-tab";
import { SessionsTab } from "@/components/profile/sessions-tab";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Back navigation */}
      <div className="mb-6">
        <Button asChild className="transition-colors hover:text-brand" size="sm" variant="ghost">
          <Link to="/library">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Library
          </Link>
        </Button>
      </div>

      <h1 className="mb-8 font-bold text-3xl">Profile Settings</h1>

      {/* Tabbed interface */}
      <Tabs className="w-full" defaultValue="profile">
        <TabsList className="mb-2 overflow-x-auto">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Smartphone className="mr-2 h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="consent">
            <FileCheck className="mr-2 h-4 w-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>

        <TabsContent value="consent">
          <ConsentTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
