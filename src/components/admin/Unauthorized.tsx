import { Lock } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold mb-2">Access denied</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        You need admin privileges to view this page. Contact your workspace administrator if you believe this is a mistake.
      </p>
    </div>
  );
}
