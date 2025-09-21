import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Globe, Lock, X } from "lucide-react";
import { useGroups } from "../../hooks/useGroups";
import { useToast } from "@/hooks/use-toast";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupModal({ open, onOpenChange }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [isLoading, setIsLoading] = useState(false);
  
  const { createGroup } = useGroups();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsLoading(true);
    
    try {
      await createGroup({
        name: groupName.trim(),
        description: description.trim(),
        visibility
      });

      toast({
        title: "Group created successfully!",
        description: `Your ${visibility} group "${groupName}" has been created.`,
      });

      // Reset form
      setGroupName("");
      setDescription("");
      setVisibility('private');
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Failed to create group",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setGroupName("");
      setDescription("");
      setVisibility('private');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-900">
            Create New Group
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="group-name" className="text-sm font-medium text-gray-700">
              Group Name *
            </Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              className="w-full"
              required
              disabled={isLoading}
              maxLength={100}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this group is about..."
              className="w-full min-h-[80px] resize-none"
              disabled={isLoading}
              maxLength={500}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Group Visibility *
            </Label>
            <RadioGroup
              value={visibility}
              onValueChange={(value: 'public' | 'private') => setVisibility(value)}
              className="space-y-3"
              disabled={isLoading}
            >
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="private" id="private" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Lock className="w-4 h-4 text-gray-600" />
                    <Label htmlFor="private" className="font-medium text-gray-900 cursor-pointer">
                      Private Group
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Only visible to members and people you invite. Perfect for study groups and close collaborations.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="public" id="public" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <Label htmlFor="public" className="font-medium text-gray-900 cursor-pointer">
                      Public Group
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500">
                    Visible to all users on the platform. Anyone can discover and join this group.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="px-6 py-2"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!groupName.trim() || isLoading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
