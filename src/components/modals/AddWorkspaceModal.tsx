import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, Plus, X } from "lucide-react";

interface Workspace {
  name: string;
  description: string;
  flowSteps: string[];
  members: string[];
  group_id: string;
}

interface AddWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWorkspace: (workspace: Workspace) => void;
  selectedGroupId?: string; // Add this to know which group we're creating workspace for
}

const mockMembers = [
  { id: "1", name: "Sarah Johnson", initials: "SJ", role: "Developer" },
  { id: "2", name: "Alex Chen", initials: "AC", role: "Designer" },
  { id: "3", name: "Mike Brown", initials: "MB", role: "Project Manager" },
  { id: "4", name: "Emily Davis", initials: "ED", role: "QA Engineer" },
  { id: "5", name: "David Wilson", initials: "DW", role: "Backend Developer" }
];

export function AddWorkspaceModal({ open, onOpenChange, onAddWorkspace, selectedGroupId }: AddWorkspaceModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [description, setDescription] = useState("");
  const [flowSteps, setFlowSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 3;

  const handleAddStep = () => {
    if (newStep.trim()) {
      setFlowSteps(prev => [...prev, newStep.trim()]);
      setNewStep("");
    }
  };

  const handleRemoveStep = (index: number) => {
    setFlowSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!workspaceName.trim() || flowSteps.length === 0 || !selectedGroupId) {
      console.error('Missing required fields for workspace creation');
      return;
    }

    setIsLoading(true);
    
    const newWorkspace: Workspace = {
      name: workspaceName,
      description,
      flowSteps,
      members: selectedMembers,
      group_id: selectedGroupId
    };

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onAddWorkspace(newWorkspace);
    
    // Reset form
    setWorkspaceName("");
    setDescription("");
    setFlowSteps([]);
    setSelectedMembers([]);
    setCurrentStep(1);
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      setWorkspaceName("");
      setDescription("");
      setFlowSteps([]);
      setSelectedMembers([]);
      setCurrentStep(1);
      onOpenChange(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return workspaceName.trim() && description.trim();
      case 2:
        return flowSteps.length > 0;
      case 3:
        return selectedMembers.length >= 0; // Allow creating workspace without selecting members initially
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-lg -mt-6 -mx-6 px-6 py-6">
          <DialogTitle className="text-xl font-semibold mb-2">
            Create New Workspace
          </DialogTitle>
          <div className="step-indicator flex items-center gap-2">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`step-dot w-2 h-2 rounded-full transition-all duration-300 ${
                  i + 1 < currentStep ? 'bg-green-400' :
                  i + 1 === currentStep ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </DialogHeader>
        
        <div className="modal-body p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="step-content">
              <div className="step-title text-lg font-semibold text-gray-900 mb-2">
                Basic Information
              </div>
              <div className="step-description text-gray-600 mb-6">
                Provide the basic details for your workspace.
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workspace-name" className="text-sm font-medium text-gray-700">
                    Workspace Name *
                  </Label>
                  <Input
                    id="workspace-name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="Enter workspace name"
                    className="w-full"
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your project goals and objectives..."
                    className="w-full min-h-[100px] resize-none"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Define Project Flow */}
          {currentStep === 2 && (
            <div className="step-content">
              <div className="step-title text-lg font-semibold text-gray-900 mb-2">
                Define Project Flow
              </div>
              <div className="step-description text-gray-600 mb-6">
                Define the key steps of your project from start to finish. This will create your analysis flow diagram.
              </div>
              
              <div className="flow-steps-builder bg-gray-50 rounded-xl p-4">
                <div className="space-y-3">
                  {flowSteps.map((step, index) => (
                    <div key={index} className="step-item flex items-center bg-white rounded-lg p-3 border border-gray-200">
                      <div className="step-number w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-semibold mr-3">
                        {index + 1}
                      </div>
                      <div className="step-text flex-1 text-sm text-gray-900">
                        {step}
                      </div>
                      <Button
                        onClick={() => handleRemoveStep(index)}
                        className="w-6 h-6 p-0 bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <div className="flex gap-2">
                    <Input
                      value={newStep}
                      onChange={(e) => setNewStep(e.target.value)}
                      placeholder="Enter step name (e.g., Phase 1: Research)"
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddStep()}
                    />
                    <Button
                      onClick={handleAddStep}
                      disabled={!newStep.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Invite Members */}
          {currentStep === 3 && (
            <div className="step-content">
              <div className="step-title text-lg font-semibold text-gray-900 mb-2">
                Invite Members
              </div>
              <div className="step-description text-gray-600 mb-6">
                Select members from your group to add to this workspace.
              </div>
              
              <div className="member-selection">
                <Input
                  placeholder="Search members..."
                  className="w-full mb-4"
                />
                
                <div className="member-list space-y-2">
                  {mockMembers.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => handleMemberToggle(member.id)}
                      className={`member-item flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedMembers.includes(member.id)
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <Avatar className="w-8 h-8 mr-3">
                        <AvatarFallback className="text-xs font-semibold">
                          {member.initials}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="member-info flex-1">
                        <div className="member-name text-sm font-medium text-gray-900">
                          {member.name}
                        </div>
                        <div className="member-role text-xs text-gray-500">
                          {member.role}
                        </div>
                      </div>
                      
                      <div className={`member-checkbox w-4 h-4 border-2 rounded transition-colors ${
                        selectedMembers.includes(member.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedMembers.includes(member.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer border-t border-gray-200 p-6 -mx-6 -mb-6 flex justify-between items-center">
          <Button
            onClick={handleBack}
            disabled={currentStep === 1 || isLoading}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Back
          </Button>
          
          <div className="flex gap-3">
            <Button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed() || isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? "Creating..." : "Create Workspace"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
