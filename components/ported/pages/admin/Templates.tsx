import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { useLocale } from '@/components/ported/hooks/useLocale';
import { getTemplates, updateTemplate } from '@/components/ported/lib/mockData';
import { Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { Template } from '@/types/admin';

const variables = [
  '{{customer.name}}',
  '{{customer.phone}}',
  '{{service.name}}',
  '{{service.duration}}',
  '{{booking.start}}',
  '{{booking.end}}',
  '{{booking.link}}',
  '{{staff.name}}',
];

const Templates = () => {
  const { t } = useLocale();
  const [emailTemplates] = useState(getTemplates('email'));
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    emailTemplates[0] || null
  );
  const [subject, setSubject] = useState(selectedTemplate?.subject || '');
  const [body, setBody] = useState(selectedTemplate?.body || '');

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setSubject(template.subject || '');
    setBody(template.body);
  };

  const handleSave = () => {
    if (selectedTemplate) {
      updateTemplate(selectedTemplate.id, { subject, body });
      toast.success('Template saved successfully');
    }
  };

  const insertVariable = (variable: string) => {
    setBody((prev) => prev + variable);
  };

  const getPreview = () => {
    return body
      .replace(/\{\{customer\.name\}\}/g, 'John Doe')
      .replace(/\{\{service\.name\}\}/g, 'Haircut')
      .replace(/\{\{service\.duration\}\}/g, '30')
      .replace(/\{\{booking\.start\}\}/g, 'Oct 30, 2025 at 09:00')
      .replace(/\{\{booking\.end\}\}/g, 'Oct 30, 2025 at 09:30')
      .replace(/\{\{booking\.link\}\}/g, 'https://bookinghub.app/booking/123')
      .replace(/\{\{staff\.name\}\}/g, 'David');
  };

  return (
    <div>
      <PageHeader title={t('templates.title')} />

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList>
          <TabsTrigger value="email">{t('templates.email')}</TabsTrigger>
          <TabsTrigger value="message">{t('templates.message')}</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-0">
          <div className="grid lg:grid-cols-[300px_1fr] gap-6">
            {/* Template List */}
            <Card className="p-4 h-fit">
              <div className="space-y-2">
                {emailTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`w-full text-start p-3 rounded-lg border transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-accent border-accent-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium text-sm">{template.subject}</div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">
                      {template.type.replace('_', ' ')} • {template.locale}
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Editor */}
            <div className="space-y-6">
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Subject</label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Body</label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={12}
                      placeholder="Email body"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      {t('templates.variables')}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {variables.map((variable) => (
                        <Badge
                          key={variable}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                          onClick={() => insertVariable(variable)}
                        >
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave}>
                      <Save className="w-4 h-4 me-2" />
                      {t('templates.save')}
                    </Button>
                    <Button variant="outline" onClick={() => toast.info('Test email sent')}>
                      <Send className="w-4 h-4 me-2" />
                      {t('templates.test')}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Preview */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">{t('templates.preview')}</h3>
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="font-medium mb-2">{subject}</div>
                  <div className="text-sm whitespace-pre-wrap">{getPreview()}</div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="message">
          <Card className="p-6">
            <p className="text-muted-foreground">Message templates coming soon...</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Templates;
