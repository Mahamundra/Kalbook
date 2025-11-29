'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { useDirection } from '@/components/providers/DirectionProvider';
import { formatDate } from '@/components/ported/lib/i18n';
import { Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ported/ui/select';

interface CoachTask {
  id: string;
  task_type: 'follow_up' | 'assessment' | 'program_update' | 'check_in' | 'other';
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  customer_id: string | null;
}

interface CoachTasksProps {
  workerId: string;
  onUpdate?: () => void;
}

export function CoachTasks({ workerId, onUpdate }: CoachTasksProps) {
  const { t, locale, isRTL } = useLocale();
  const [tasks, setTasks] = useState<CoachTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    task_type: 'other' as CoachTask['task_type'],
    description: '',
    status: 'pending' as CoachTask['status'],
    due_date: '',
    notes: '',
    customer_id: '',
  });

  useEffect(() => {
    fetchTasks();
  }, [workerId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/coaches/${workerId}/tasks`);
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.description.trim()) {
      toast.error('Please enter a task description');
      return;
    }

    try {
      const response = await fetch(`/api/coaches/${workerId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customer_id: formData.customer_id || null,
          due_date: formData.due_date || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Task created successfully');
        setIsCreateDialogOpen(false);
        setFormData({
          task_type: 'other',
          description: '',
          status: 'pending',
          due_date: '',
          notes: '',
          customer_id: '',
        });
        fetchTasks();
        onUpdate?.();
      } else {
        toast.error(data.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleStatusChange = async (taskId: string, status: CoachTask['status']) => {
    try {
      const response = await fetch(`/api/coaches/${workerId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Task updated');
        fetchTasks();
        onUpdate?.();
      } else {
        toast.error(data.error || 'Failed to update task');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const getStatusBadge = (status: CoachTask['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'in_progress':
        return <Badge variant="default"><Clock className="w-3 h-3 mr-1" />In Progress</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading...</div>;
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h3 className={`text-sm font-semibold text-muted-foreground uppercase ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('coachTasks.title') || 'Tasks'}
        </h3>
        <Button
          onClick={() => setIsCreateDialogOpen(true)}
          size="sm"
          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
        >
          <Plus className="w-4 h-4" />
          {t('coachTasks.addTask') || 'Add Task'}
        </Button>
      </div>

      {pendingTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('coachTasks.pending') || 'Pending'}</h4>
          {pendingTasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="pt-4">
                <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''} mb-2`}>
                  <div className="flex-1">
                    <p className="font-medium text-sm capitalize">{task.task_type.replace('_', ' ')}</p>
                    <p className="text-sm mt-1">{task.description}</p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {formatDate(task.due_date, locale)}
                      </p>
                    )}
                  </div>
                  {getStatusBadge(task.status)}
                </div>
                {task.notes && (
                  <p className="text-xs text-muted-foreground mt-2">{task.notes}</p>
                )}
                <div className={`flex gap-2 mt-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {task.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(task.id, 'in_progress')}
                    >
                      {t('coachTasks.start') || 'Start'}
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(task.id, 'completed')}
                    >
                      {t('coachTasks.complete') || 'Complete'}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(task.id, 'cancelled')}
                  >
                    {t('coachTasks.cancel') || 'Cancel'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">{t('coachTasks.completed') || 'Completed'}</h4>
          {completedTasks.slice(0, 5).map((task) => (
            <Card key={task.id}>
              <CardContent className="pt-4">
                <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div>
                    <p className="font-medium text-sm capitalize">{task.task_type.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  </div>
                  {getStatusBadge(task.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t('coachTasks.noTasks') || 'No tasks assigned'}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('coachTasks.createTask') || 'Create Task'}</DialogTitle>
            <DialogDescription>
              {t('coachTasks.createDescription') || 'Add a new task for this coach'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('coachTasks.type') || 'Type'}</Label>
              <Select value={formData.task_type} onValueChange={(value) => setFormData({ ...formData, task_type: value as CoachTask['task_type'] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow_up">{t('coachTasks.followUp') || 'Follow Up'}</SelectItem>
                  <SelectItem value="assessment">{t('coachTasks.assessment') || 'Assessment'}</SelectItem>
                  <SelectItem value="program_update">{t('coachTasks.programUpdate') || 'Program Update'}</SelectItem>
                  <SelectItem value="check_in">{t('coachTasks.checkIn') || 'Check In'}</SelectItem>
                  <SelectItem value="other">{t('coachTasks.other') || 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('coachTasks.description') || 'Description'} *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('coachTasks.descriptionPlaceholder') || 'Task description...'}
                rows={3}
              />
            </div>
            <div>
              <Label>{t('coachTasks.dueDate') || 'Due Date'}</Label>
              <Input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('coachTasks.notes') || 'Notes'}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleCreate}>
              {t('common.create') || 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

