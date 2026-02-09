import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettings } from '@/app/contexts/SettingsContext';
import { DEFAULT_TEMPLATES, validateTemplate, interpolateTemplate, getTemplateVariables } from '@/app/lib/templateUtils';
import { Settings, Trash2, Edit, Eye, Plus, Check, X, RotateCcw } from 'lucide-react';

export const TemplateDialog = ({ children }: { children: React.ReactNode }) => {
  const { templateSettings, metadataLimits } = useSettings();
  const [open, setOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [isEditingDefault, setIsEditingDefault] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [previewMode, setPreviewMode] = useState<string | null>(null);

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      alert('Please provide both template name and content');
      return;
    }

    const validation = validateTemplate(newTemplateContent);
    if (!validation.isValid) {
      alert(`Template is missing required variables: ${validation.missingVariables.join(', ')}`);
      return;
    }

    templateSettings.addUserTemplate({
      name: newTemplateName.trim(),
      template: newTemplateContent.trim(),
    });

    setNewTemplateName('');
    setNewTemplateContent('');
    setEditingTemplate(null);
  };

  const handleUpdateTemplate = (id: string) => {
    const validation = validateTemplate(newTemplateContent);
    if (!validation.isValid) {
      alert(`Template is missing required variables: ${validation.missingVariables.join(', ')}`);
      return;
    }

    templateSettings.updateUserTemplate(id, {
      name: newTemplateName.trim(),
      template: newTemplateContent.trim(),
    });

    setNewTemplateName('');
    setNewTemplateContent('');
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      templateSettings.deleteUserTemplate(id);
    }
  };

  const startEdit = (template?: { id: string; name: string; template: string; isPreset?: boolean }) => {
    if (template) {
      setNewTemplateName(template.name);
      setNewTemplateContent(template.template);
      setEditingTemplate(template.id);
      setIsEditingDefault(!!template.isPreset);
    } else {
      setNewTemplateName('');
      setNewTemplateContent('');
      setEditingTemplate('new');
      setIsEditingDefault(false);
    }
  };

  const cancelEdit = () => {
    setNewTemplateName('');
    setNewTemplateContent('');
    setEditingTemplate(null);
    setIsEditingDefault(false);
  };

  const handleUpdateDefaultTemplate = (id: string) => {
    const validation = validateTemplate(newTemplateContent);
    if (!validation.isValid) {
      alert(`Template is missing required variables: ${validation.missingVariables.join(', ')}`);
      return;
    }

    templateSettings.editDefaultTemplate(id, newTemplateContent.trim());

    setNewTemplateName('');
    setNewTemplateContent('');
    setEditingTemplate(null);
    setIsEditingDefault(false);
  };

  const handleResetDefaultTemplate = (id: string) => {
    if (confirm('Are you sure you want to reset this default template to its original content?')) {
      templateSettings.resetDefaultTemplate(id);
    }
  };

  const handleResetAllDefaults = () => {
    if (confirm('Are you sure you want to reset ALL default templates to their original content?')) {
      templateSettings.resetAllDefaultTemplates();
    }
  };

  const getPreviewContent = (template: string) => {
    return interpolateTemplate(template, {
      titleLimit: metadataLimits.titleLimit,
      descriptionLimit: metadataLimits.descriptionLimit,
      keywordLimit: metadataLimits.keywordLimit,
      fileName: 'example-image.jpg',
    });
  };

  const allTemplates = [
    ...DEFAULT_TEMPLATES.map(t => {
      const edited = templateSettings.editedDefaultTemplates?.find(e => e.id === t.id);
      return {
        ...t,
        isPreset: true,
        template: edited ? edited.template : t.template,
        isEdited: !!edited,
      };
    }),
    ...templateSettings.userTemplates.map(t => ({ ...t, isPreset: false, isEdited: false })),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Template Management
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Available Templates</h3>
              <div className="flex gap-2">
                {(templateSettings.editedDefaultTemplates?.length || 0) > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetAllDefaults}
                    className="text-amber-600 border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset All Defaults
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => templateSettings.setActiveTemplate(null)}
                >
                  Use Default
                </Button>
                <Button
                  size="sm"
                  onClick={() => startEdit()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              {allTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    templateSettings.activeTemplateId === template.id
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{template.name}</h4>
                        {template.isPreset && (
                          <Badge variant="secondary">Preset</Badge>
                        )}
                        {template.isEdited && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">Edited</Badge>
                        )}
                        {templateSettings.activeTemplateId === template.id && (
                          <Badge variant="default">Active</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.template.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewMode(previewMode === template.id ? null : template.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {template.isPreset ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {template.isEdited && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetDefaultTemplate(template.id)}
                              title="Reset to original"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant={templateSettings.activeTemplateId === template.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => templateSettings.setActiveTemplate(template.id)}
                      >
                        {templateSettings.activeTemplateId === template.id ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          'Use'
                        )}
                      </Button>
                    </div>
                  </div>

                  {previewMode === template.id && (
                    <div className="mt-3 p-3 bg-muted rounded-md">
                      <h5 className="text-sm font-medium mb-2">Preview:</h5>
                      <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                        {getPreviewContent(template.template)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="editor" className="space-y-4">
            <h3 className="text-lg font-medium">
              {editingTemplate ? (editingTemplate === 'new' ? 'Create New Template' : 'Edit Template') : 'Template Editor'}
            </h3>
            
            {editingTemplate ? (
              <div className="space-y-4">
                {isEditingDefault && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      You are editing a default template. Changes will be saved as your custom version.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Template Name</label>
                  <Input
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Enter template name..."
                    disabled={isEditingDefault}
                    className={isEditingDefault ? "bg-muted" : ""}
                  />
                  {isEditingDefault && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Default template names cannot be changed
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Template Content</label>
                  <Textarea
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    placeholder="Enter your template content..."
                    className="min-h-[300px]"
                  />
                </div>
                
                <div className="flex gap-2">
                  {editingTemplate === 'new' ? (
                    <Button onClick={handleCreateTemplate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </Button>
                  ) : (
                    <Button onClick={() => {
                      if (isEditingDefault) {
                        handleUpdateDefaultTemplate(editingTemplate);
                      } else {
                        handleUpdateTemplate(editingTemplate);
                      }
                    }}>
                      <Check className="h-4 w-4 mr-2" />
                      Update Template
                    </Button>
                  )}
                  <Button variant="outline" onClick={cancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
                
                {newTemplateContent && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Validation</h4>
                    {(() => {
                      const validation = validateTemplate(newTemplateContent);
                      return validation.isValid ? (
                        <div className="text-sm text-green-600 dark:text-green-400">
                          ✓ Template is valid and contains all required variables
                        </div>
                      ) : (
                        <div className="text-sm text-destructive">
                          ✗ Missing required variables: {validation.missingVariables.join(', ')}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Select "Create New" from the Templates tab or edit an existing template to use the editor.
                </p>
                <Button onClick={() => startEdit()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Creating Template
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="variables" className="space-y-4">
            <h3 className="text-lg font-medium">Template Variables</h3>
            <p className="text-sm text-muted-foreground">
              Use these variables in your templates to customize the AI prompts:
            </p>

            <div className="space-y-3">
              {getTemplateVariables().map((variable) => (
                <div key={variable} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-card">
                  <code className="px-2 py-1 bg-muted rounded text-sm font-mono text-foreground">
                    {variable}
                  </code>
                  <span className="text-sm text-muted-foreground">
                    {variable.includes('titleLimit') && 'Character limit for the title field'}
                    {variable.includes('descriptionLimit') && 'Character limit for the description field'}
                    {variable.includes('keywordLimit') && 'Number of keywords to generate'}
                    {variable.includes('fileName') && 'Current file name (optional)'}
                    {variable.includes('currentDate') && 'Current date (optional)'}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Example Template:</h4>
              <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
{`Generate metadata for this image.

Requirements:
1. Title:
   - Target approximately {{titleLimit}} characters
   - Write a complete, descriptive title

2. Description:
   - Target under {{descriptionLimit}} characters
   - Write a complete, detailed description

3. Keywords:
   - Provide approximately {{keywordLimit}} keywords
   - Comma-separated

Return ONLY JSON:
{"title": "...", "description": "...", "keywords": "..."}`}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};