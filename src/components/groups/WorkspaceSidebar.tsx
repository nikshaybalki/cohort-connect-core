import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { type Workspace } from "@/hooks/useWorkspaces";

interface WorkspaceSidebarProps {
  selectedWorkspace: string | null;
  onWorkspaceSelect: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
  workspaces: (Workspace & { avatar: string; progress: number; flowSteps: string[] })[];
}

export function WorkspaceSidebar({ selectedWorkspace, onWorkspaceSelect, onCreateWorkspace, workspaces }: WorkspaceSidebarProps) {
  return (
    <aside className="hidden lg:block w-[280px] flex-shrink-0">
      {/* Workspace Action Buttons Section */}
      <div className="workspace-actions">
        <Button 
          onClick={onCreateWorkspace}
          className="workspace-action-button w-full h-11 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Workspace
        </Button>
        
        <Button 
          className="workspace-action-button w-full h-11 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-xl"
        >
          <Search className="w-4 h-4 mr-2" />
          Explore Workspace
        </Button>
      </div>

      {/* Workspace Separator */}
      <div className="workspace-separator">
        <span>Workspaces</span>
      </div>

      {/* Workspaces List */}
      <div className="workspaces-container">
        {workspaces.map((workspace) => (
          <div
            key={workspace.id}
            onClick={() => onWorkspaceSelect(workspace.id)}
            className={`workspace-item p-3 mb-2 border rounded-xl cursor-pointer transition-all duration-200 hover:border-green-500 hover:shadow-md hover:scale-[0.98] ${
              selectedWorkspace === workspace.id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex items-center">
              {/* Workspace Avatar */}
              <div className="workspace-avatar w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm mr-3">
                {workspace.avatar}
              </div>
              
              {/* Workspace Info */}
              <div className="workspace-info flex-1 min-w-0">
                <div className="workspace-name text-sm font-semibold text-gray-900 mb-1 truncate">
                  {workspace.name}
                </div>
                <div className="workspace-description text-xs text-gray-500 truncate">
                  {workspace.description}
                </div>
                {/* Progress Bar */}
                <div className="progress-bar mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${workspace.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{workspace.progress}% complete</div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {workspaces.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No workspaces yet</p>
            <p className="text-xs mt-1">Create your first workspace to get started</p>
          </div>
        )}
      </div>
    </aside>
  );
}
