import React, { useState } from 'react';
import { User, Plus, Download, Upload, HardDrive } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { toast } from 'react-hot-toast';
import type { UserProfile } from '../utils/userManager';

interface UserManagerProps {
  currentUser: UserProfile;
  users: UserProfile[];
  onSwitchUser: (userId: string) => Promise<void>;
  onCreateUser: (name: string) => Promise<UserProfile | null>;
  onExportData: () => Promise<boolean>;
  onImportData: (file: File) => Promise<boolean>;
  onCleanupData: (keepCount: number) => Promise<number>;
  onGetStorageUsage: () => Promise<{ used: number; quota: number }>;
  isOpen: boolean;
  onClose: () => void;
}

export function UserManager({
  currentUser,
  users,
  onSwitchUser,
  onCreateUser,
  onExportData,
  onImportData,
  onCleanupData,
  onGetStorageUsage,
  isOpen,
  onClose,
}: UserManagerProps) {
  const [newUserName, setNewUserName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateUser = async () => {
    if (!newUserName.trim()) {
      toast.error('Please enter a user name');
      return;
    }

    setIsCreating(true);
    try {
      const newUser = await onCreateUser(newUserName.trim());
      if (newUser) {
        setNewUserName('');
        toast.success(`Created user: ${newUser.name}`);
      } else {
        toast.error('Failed to create user');
      }
    } catch {
      toast.error('Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    if (userId === currentUser.id) return;

    setIsLoading(true);
    try {
      await onSwitchUser(userId);
      const user = users.find(u => u.id === userId);
      toast.success(`Switched to: ${user?.name}`);
    } catch {
      toast.error('Failed to switch user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    setIsLoading(true);
    try {
      const success = await onExportData();
      if (success) {
        toast.success('Data exported successfully');
      } else {
        toast.error('Failed to export data');
      }
    } catch {
      toast.error('Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const success = await onImportData(file);
      if (success) {
        toast.success('Data imported successfully');
      } else {
        toast.error('Failed to import data');
      }
    } catch {
      toast.error('Failed to import data');
    } finally {
      setIsLoading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleCleanupData = async () => {
    setIsLoading(true);
    try {
      const deletedCount = await onCleanupData(20); // Keep only 20 recent conversations
      if (deletedCount > 0) {
        toast.success(`Cleaned up ${deletedCount} old conversations`);
      } else {
        toast.info('No old conversations to clean up');
      }
    } catch {
      toast.error('Failed to cleanup data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const info = await onGetStorageUsage();
      setStorageInfo(info);
    } catch (error) {
      console.error('Failed to get storage info:', error);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      loadStorageInfo();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Current User */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current User</h3>
            <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <User className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-blue-900 font-medium">{currentUser.name}</span>
            </div>
          </div>

          {/* User List */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">All Users</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSwitchUser(user.id)}
                  disabled={isLoading || user.id === currentUser.id}
                  className={`w-full flex items-center p-2 rounded-lg text-left transition-colors ${
                    user.id === currentUser.id
                      ? 'bg-blue-100 text-blue-900 cursor-default'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <User className="h-3 w-3 mr-2" />
                  <span className="text-sm">{user.name}</span>
                  {user.id === currentUser.id && (
                    <span className="ml-auto text-xs text-blue-600">Current</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Create New User */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Create New User</h3>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="User Name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                disabled={isCreating}
                className="flex-1"
              />
              <Button
                onClick={handleCreateUser}
                disabled={isCreating || !newUserName.trim()}
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Storage Info */}
          {storageInfo && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Storage Usage</h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Used:</span>
                  <span className="font-medium">{formatBytes(storageInfo.used)}</span>
                </div>
                {storageInfo.quota > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium">{formatBytes(storageInfo.quota)}</span>
                  </div>
                )}
                {storageInfo.quota > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(storageInfo.used / storageInfo.quota) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Management */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Data Management</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleExportData}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              
              <label className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  disabled={isLoading}
                  className="hidden"
                />
                <Button
                  as="span"
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  Import Data
                </Button>
              </label>
            </div>

            <Button
              onClick={handleCleanupData}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="w-full flex items-center justify-center gap-2"
            >
              <HardDrive className="h-4 w-4" />
              Clean Old Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}