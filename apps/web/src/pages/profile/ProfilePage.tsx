import { useState, useEffect } from 'react';
import { apiClient, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

// Types from generated API spec
type UserProfile = Awaited<ReturnType<typeof apiClient.getCurrentUser>>;

export default function ProfilePage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    title: '',
    company: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getCurrentUser();
      setProfile(data);
      setFormData({
        name: data.profile.name,
        bio: data.profile.bio || '',
        title: data.profile.title || '',
        company: data.profile.company || '',
      });
    } catch (error) {
      if (error instanceof ApiError) {
        toast({
          variant: 'error',
          title: 'Failed to load profile',
          description: error.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.profile.name,
        bio: profile.profile.bio || '',
        title: profile.profile.title || '',
        company: profile.profile.company || '',
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const changes = {
        name: formData.name !== profile?.profile.name ? formData.name : undefined,
        bio: formData.bio !== profile?.profile.bio ? formData.bio : undefined,
        title: formData.title !== profile?.profile.title ? formData.title : undefined,
        company: formData.company !== profile?.profile.company ? formData.company : undefined,
      };

      if (import.meta.env.DEV) {
        console.log('[PROFILE] Profile update started', {
          userId: profile?.id,
          changes: Object.fromEntries(
            Object.entries(changes).filter(([, value]) => value !== undefined)
          ),
          timestamp: new Date().toISOString(),
        });
      }

      const updated = await apiClient.updateCurrentUser({
        name: formData.name,
        bio: formData.bio || undefined,
        title: formData.title || undefined,
        company: formData.company || undefined,
      });

      setProfile(updated);
      setIsEditing(false);

      if (import.meta.env.DEV) {
        console.log('[PROFILE] Profile updated successfully', {
          userId: updated.id,
          timestamp: new Date().toISOString(),
        });
      }

      toast({
        variant: 'success',
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[ERROR] Profile update failed', {
          userId: profile?.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }

      if (error instanceof ApiError) {
        toast({
          variant: 'error',
          title: 'Failed to update profile',
          description: error.message,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>View and manage your profile information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          // Edit mode
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Your title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                placeholder="Your company"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={profile.role} disabled />
              <p className="text-xs text-muted-foreground">Role cannot be changed</p>
            </div>
          </>
        ) : (
          // View mode
          <>
            <div className="space-y-2">
              <Label>Name</Label>
              <p className="text-sm">{profile.profile.name}</p>
            </div>
            {profile.profile.title && (
              <div className="space-y-2">
                <Label>Title</Label>
                <p className="text-sm">{profile.profile.title}</p>
              </div>
            )}
            {profile.profile.company && (
              <div className="space-y-2">
                <Label>Company</Label>
                <p className="text-sm">{profile.profile.company}</p>
              </div>
            )}
            {profile.profile.bio && (
              <div className="space-y-2">
                <Label>Bio</Label>
                <p className="text-sm whitespace-pre-wrap">{profile.profile.bio}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-sm">{profile.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <p className="text-sm capitalize">{profile.role}</p>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        ) : (
          <Button onClick={handleEdit}>Edit Profile</Button>
        )}
      </CardFooter>
    </Card>
  );
}
