import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRepo } from '@/storage/RepositoryProvider';

export default function Onboarding() {
  const navigate = useNavigate();
  const repo = useRepo();
  const [name, setName] = React.useState('');

  const canStart = name.trim().length > 0;

  const start = async () => {
    if (!canStart) return;
    await repo.updateSettings({ userName: name.trim() });
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center px-6 py-12">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Dumbbell className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold">Workout Tracker</h1>
        <p className="text-sm text-muted-foreground">
          A calm place to log what you lift. Let's set you up.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && start()}
          />
        </div>

        <Button size="lg" disabled={!canStart} onClick={start}>
          Get started
        </Button>
      </div>
    </div>
  );
}
