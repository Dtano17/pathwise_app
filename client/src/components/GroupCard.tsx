import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Lock, Globe, Crown } from 'lucide-react';
import { format } from 'date-fns';

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    description: string | null;
    isPrivate: boolean;
    memberCount: number;
    role: string;
    createdAt: string;
  };
  onClick?: () => void;
}

export default function GroupCard({ group, onClick }: GroupCardProps) {
  const isAdmin = group.role === 'admin';

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {group.name}
              {isAdmin && (
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                  <Crown className="w-3 h-3 mr-1" />
                  Admin
                </Badge>
              )}
            </CardTitle>
            {group.description && (
              <CardDescription className="line-clamp-2">
                {group.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {/* Member Count */}
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
          </div>

          {/* Privacy Badge */}
          <div className="flex items-center gap-1.5">
            {group.isPrivate ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Private</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span>Public</span>
              </>
            )}
          </div>
        </div>

        {/* Created Date */}
        <div className="text-xs text-muted-foreground">
          Created {format(new Date(group.createdAt), 'MMM d, yyyy')}
        </div>
      </CardContent>
    </Card>
  );
}
