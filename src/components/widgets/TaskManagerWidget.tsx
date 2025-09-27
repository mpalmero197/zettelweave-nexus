import { TaskManager } from '@/components/TaskManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare } from 'lucide-react';

export function TaskManagerWidget() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckSquare className="h-5 w-5 text-primary" />
          Task Manager
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TaskManager />
      </CardContent>
    </Card>
  );
}