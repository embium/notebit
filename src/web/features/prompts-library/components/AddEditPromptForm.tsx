import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Tag as TagIcon } from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

//State
import {
  addPrompt,
  updatePrompt,
} from '@/features/prompts-library/state/promptsLibraryState';

// Utils
import { cn } from '@/shared/utils';

// Types
import { Prompt } from '@shared/types/promptsLibrary';

interface AddEditPromptFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt?: Prompt;
}

const AddEditPromptFormComponent: React.FC<AddEditPromptFormProps> = ({
  open,
  onOpenChange,
  prompt,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'user' | 'system'>('user');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [promptText, setPromptText] = useState('');
  const isEditing = !!prompt;

  // Reset form when prompt changes
  useEffect(() => {
    if (prompt) {
      setName(prompt.name);
      setRole(prompt.role);
      setTags([...prompt.tags]);
      setPromptText(prompt.prompt);
    } else {
      setName('');
      setRole('user');
      setTags([]);
      setPromptText('');
    }
  }, [prompt, open]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !promptText.trim()) {
      alert('Name and prompt text are required');
      return;
    }

    const submittedPrompt: Prompt = {
      id: prompt?.id || uuidv4(),
      name,
      role,
      tags,
      prompt: promptText,
      bookmarked: prompt?.bookmarked || false,
    };

    if (isEditing) {
      updatePrompt(submittedPrompt);
    } else {
      addPrompt(submittedPrompt);
    }

    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? 'Edit Prompt' : 'Add New Prompt'}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-sm font-medium"
            >
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter prompt name"
              className="bg-background"
              required
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="role"
              className="text-sm font-medium"
            >
              Role
            </Label>
            <Select
              value={role}
              onValueChange={(value: 'user' | 'system') => setRole(value)}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value="user"
                  className="flex items-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                  User
                </SelectItem>
                <SelectItem
                  value="system"
                  className="flex items-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  System
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="tags"
              className="text-sm font-medium"
            >
              Tags
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <TagIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add a tag"
                  className="pl-10 bg-background"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                onClick={handleAddTag}
                variant="outline"
              >
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag) => (
                  <div
                    key={tag}
                    className={cn(
                      'px-2 py-1 rounded-md flex items-center gap-1',
                      tag === 'refine'
                        ? 'bg-amber-500/10 text-amber-700 border border-amber-300'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-secondary-foreground/70 hover:text-secondary-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="prompt"
              className="text-sm font-medium"
            >
              Prompt
            </Label>
            <Textarea
              id="prompt"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Enter your prompt text"
              className="h-48 bg-background"
              required
            />
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="ml-2"
            >
              {isEditing ? 'Update' : 'Add'} Prompt
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const AddEditPromptForm = AddEditPromptFormComponent;
