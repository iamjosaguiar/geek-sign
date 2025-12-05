"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Users } from "lucide-react";

interface InvitePageProps {
  params: { token: string };
}

interface InvitationData {
  teamName: string;
  inviterName: string;
  inviterEmail: string;
  email: string;
  expiresAt: string;
}

export default function InvitePage({ params }: InvitePageProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/invite/${params.token}`);
        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Invalid invitation");
          return;
        }

        const data = await response.json();
        setInvitation(data);
      } catch {
        setError("Failed to load invitation");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [params.token]);

  const handleAccept = async () => {
    if (!session?.user) {
      // Redirect to login with return URL
      signIn(undefined, { callbackUrl: `/invite/${params.token}` });
      return;
    }

    setIsAccepting(true);
    try {
      const response = await fetch(`/api/invite/${params.token}/accept`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to accept invitation");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/team");
      }, 2000);
    } catch {
      setError("Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Invitation Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Welcome to the team!</h2>
            <p className="text-muted-foreground">
              Redirecting you to the team page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Team Invitation</CardTitle>
          <CardDescription>
            You&apos;ve been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invitation && (
            <>
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-1">Team</p>
                <p className="font-medium">{invitation.teamName}</p>
                <p className="text-sm text-muted-foreground mt-3 mb-1">
                  Invited by
                </p>
                <p className="font-medium">
                  {invitation.inviterName || invitation.inviterEmail}
                </p>
              </div>

              {session?.user ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Logged in as{" "}
                    <span className="font-medium">{session.user.email}</span>
                  </p>
                  <Button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="w-full"
                  >
                    {isAccepting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accepting...
                      </>
                    ) : (
                      "Accept Invitation"
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Sign in or create an account to accept this invitation
                  </p>
                  <Button onClick={handleAccept} className="w-full">
                    Sign In to Accept
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center">
                This invitation expires on{" "}
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
