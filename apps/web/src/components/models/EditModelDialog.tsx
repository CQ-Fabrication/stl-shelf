import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { orpc } from '@/utils/orpc';
import type { Model } from '../../../../server/src/types/model';

interface EditModelDialogProps {
  model: Model;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditModelDialog({
  model,
  open,
  onOpenChange,
}: EditModelDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: model.latestMetadata.name,
    description: model.latestMetadata.description || '',
    tags: model.latestMetadata.tags.join(', '),
    material: model.latestMetadata.printSettings?.material || '',
    layerHeight:
      model.latestMetadata.printSettings?.layerHeight?.toString() || '',
    infill: model.latestMetadata.printSettings?.infill?.toString() || '',
    printTime: model.latestMetadata.printSettings?.printTime?.toString() || '',
    weight: model.latestMetadata.printSettings?.weight?.toString() || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const tags = data.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const metadata = {
        name: data.name,
        description: data.description || undefined,
        tags,
        createdAt: model.latestMetadata.createdAt,
        updatedAt: new Date().toISOString(),
        printSettings: {
          material: data.material || undefined,
          layerHeight: data.layerHeight
            ? Number.parseFloat(data.layerHeight)
            : undefined,
          infill: data.infill ? Number.parseFloat(data.infill) : undefined,
          printTime: data.printTime
            ? Number.parseInt(data.printTime, 10)
            : undefined,
          weight: data.weight ? Number.parseFloat(data.weight) : undefined,
        },
      };

      return orpc.updateModelMetadata.mutate({
        modelId: model.id,
        metadata,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['getModel', { id: model.id }],
      });
      queryClient.invalidateQueries({ queryKey: ['listModels'] });
      toast.success('Model updated successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to update model: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const currentTags = formData.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Model</DialogTitle>
          <DialogDescription>
            Update the metadata and information for {model.latestMetadata.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Model Name</Label>
                <Input
                  id="name"
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  value={formData.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  onChange={(e) =>
                    handleInputChange('description', e.target.value)
                  }
                  placeholder="Optional description"
                  value={formData.description}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                onChange={(e) => handleInputChange('tags', e.target.value)}
                placeholder="Enter tags separated by commas"
                value={formData.tags}
              />
              {currentTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {currentTags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Print Settings */}
            <div className="space-y-3">
              <Label className="font-medium text-base">Print Settings</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="material">Material</Label>
                  <Input
                    id="material"
                    onChange={(e) =>
                      handleInputChange('material', e.target.value)
                    }
                    placeholder="e.g., PLA, ABS, PETG"
                    value={formData.material}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="layerHeight">Layer Height (mm)</Label>
                  <Input
                    id="layerHeight"
                    onChange={(e) =>
                      handleInputChange('layerHeight', e.target.value)
                    }
                    placeholder="0.2"
                    step="0.01"
                    type="number"
                    value={formData.layerHeight}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="infill">Infill (%)</Label>
                  <Input
                    id="infill"
                    max="100"
                    min="0"
                    onChange={(e) =>
                      handleInputChange('infill', e.target.value)
                    }
                    placeholder="20"
                    type="number"
                    value={formData.infill}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="printTime">Print Time (minutes)</Label>
                  <Input
                    id="printTime"
                    min="0"
                    onChange={(e) =>
                      handleInputChange('printTime', e.target.value)
                    }
                    placeholder="120"
                    type="number"
                    value={formData.printTime}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (grams)</Label>
                <Input
                  className="w-full"
                  id="weight"
                  min="0"
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="25.5"
                  step="0.1"
                  type="number"
                  value={formData.weight}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              disabled={updateMutation.isPending}
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={updateMutation.isPending} type="submit">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
