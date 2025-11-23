/**
 * Filter Presets Component
 * Manages saving and loading filter presets
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Save, X, Trash2, Loader2, Edit2 } from 'lucide-react';
import { ConfirmationDialog } from '../../../../components/common/ConfirmationDialog';
import { getFilterPresets, saveFilterPreset, updateFilterPreset, deleteFilterPreset, type FilterPreset } from '../../utils/filterPresets';
import { areFiltersEqual } from '../../utils/filterComparison';
import type { Filter } from '../../types/filters';

type FilterPresetsProps = {
  pageId: string;
  currentFilters?: Filter;
  onLoadPreset: (filters: Filter | undefined) => void;
};

export function FilterPresets({ pageId, currentFilters, onLoadPreset }: FilterPresetsProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState<string | null>(null);
  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateAsNew, setUpdateAsNew] = useState(false);
  
  // Component-level guard to prevent duplicate calls in the same render cycle
  const loadingRef = useRef<string | null>(null);
  
  // Load presets when pageId changes
  // The getFilterPresets function now handles deduplication at module level
  useEffect(() => {
    // Skip if we're already loading this pageId
    if (loadingRef.current === pageId) {
      return;
    }

    let isMounted = true;
    loadingRef.current = pageId;
    setIsLoading(true);

    const loadPresets = async () => {
      try {
        const loadedPresets = await getFilterPresets(pageId);
        // Only update state if component is still mounted and still loading the same pageId
        if (isMounted && loadingRef.current === pageId) {
          setPresets(loadedPresets);
          setLoadedPresetId(null); // Reset loaded preset when switching pages
          setIsLoading(false);
          loadingRef.current = null;
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        if (isMounted && loadingRef.current === pageId) {
          console.error('Failed to load presets:', error);
          setIsLoading(false);
          loadingRef.current = null;
        }
      }
    };
    
    loadPresets();

    // Cleanup: mark component as unmounted and clear loading ref
    return () => {
      isMounted = false;
      if (loadingRef.current === pageId) {
        loadingRef.current = null;
      }
    };
  }, [pageId]);

  // Check if current filters differ from loaded preset
  const loadedPreset = useMemo(() => {
    return loadedPresetId ? presets.find(p => p.id === loadedPresetId) : null;
  }, [loadedPresetId, presets]);

  const hasModifications = useMemo(() => {
    if (!loadedPreset || !currentFilters) return false;
    return !areFiltersEqual(currentFilters, loadedPreset.filters);
  }, [loadedPreset, currentFilters]);

  const handleSave = async () => {
    if (!presetName.trim()) return;
    setIsSaving(true);
    try {
      const newPreset = await saveFilterPreset(pageId, {
        name: presetName.trim(),
        filters: currentFilters,
      });
      setPresets([...presets, newPreset]);
      setPresetName('');
      setShowSaveDialog(false);
      setLoadedPresetId(newPreset.id); // Mark as loaded
    } catch (error) {
      console.error('Failed to save preset:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset loaded preset when filters are cleared externally
  useEffect(() => {
    if (!currentFilters || (currentFilters && 'childs' in currentFilters && currentFilters.childs.length === 0)) {
      setLoadedPresetId(null);
    }
  }, [currentFilters]);

  const handleLoad = (preset: FilterPreset) => {
    onLoadPreset(preset.filters);
    setLoadedPresetId(preset.id);
  };

  const handleUpdate = () => {
    if (!loadedPresetId || !currentFilters) return;
    setShowUpdateDialog(true);
  };

  const confirmUpdate = async () => {
    if (!loadedPresetId || !currentFilters) return;
    
    setIsSaving(true);
    try {
      if (updateAsNew) {
        // Save as new preset
        const newPreset = await saveFilterPreset(pageId, {
          name: `${loadedPreset?.name} (Copy)`,
          filters: currentFilters,
        });
        setPresets([...presets, newPreset]);
        setLoadedPresetId(newPreset.id);
      } else {
        // Update existing preset
        const updated = await updateFilterPreset(pageId, loadedPresetId, {
          filters: currentFilters,
        });
        if (updated) {
          setPresets(presets.map(p => p.id === loadedPresetId ? updated : p));
        }
      }
      setShowUpdateDialog(false);
      setUpdateAsNew(false);
    } catch (error) {
      console.error('Failed to update preset:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresetToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!presetToDelete) return;
    
    const success = await deleteFilterPreset(pageId, presetToDelete);
    if (success) {
      setPresets(presets.filter((p) => p.id !== presetToDelete));
    }
    setDeleteConfirmOpen(false);
    setPresetToDelete(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">Saved Filters</h3>
        <div className="flex items-center gap-2">
          {hasModifications && loadedPresetId && (
            <button
              onClick={handleUpdate}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 rounded-lg transition-colors"
              title="Save changes to preset"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Update
            </button>
          )}
          <button
            onClick={() => setShowSaveDialog(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            Save Current
          </button>
        </div>
      </div>

      {showSaveDialog && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                } else if (e.key === 'Escape') {
                  setShowSaveDialog(false);
                  setPresetName('');
                }
              }}
            />
            <button
              onClick={handleSave}
              disabled={!presetName.trim() || isSaving}
              className="px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setPresetName('');
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </div>
      ) : presets.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
          No saved presets
        </p>
      ) : (
        <div className="space-y-1.5">
          {presets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleLoad(preset)}
              className="flex items-center justify-between p-2.5 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {preset.name}
                  </p>
                  {preset.id === loadedPresetId && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary rounded">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(preset.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(preset.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 transition-opacity"
                aria-label="Delete preset"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setPresetToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Filter Preset"
        message="Are you sure you want to delete this preset? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Update Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showUpdateDialog}
        onClose={() => {
          setShowUpdateDialog(false);
          setUpdateAsNew(false);
        }}
        onConfirm={confirmUpdate}
        title="Update Filter Preset"
        message={
          <div className="space-y-3">
            <p>How would you like to save your changes?</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="updateType"
                  checked={!updateAsNew}
                  onChange={() => setUpdateAsNew(false)}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">Update existing preset "{loadedPreset?.name}"</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="updateType"
                  checked={updateAsNew}
                  onChange={() => setUpdateAsNew(true)}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-sm">Save as new preset</span>
              </label>
            </div>
          </div>
        }
        confirmText={isSaving ? 'Saving...' : 'Save'}
        cancelText="Cancel"
        variant="info"
        isLoading={isSaving}
      />
    </div>
  );
}

