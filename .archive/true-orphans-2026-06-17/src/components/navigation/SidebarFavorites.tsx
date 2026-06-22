/**
 * Sidebar Favorites Component
 * Allows users to pin frequently used pages for quick access
 * Persists favorites in localStorage
 */

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Star, 
  StarOff, 
  GripVertical,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface FavoriteItem {
  id: string;
  path: string;
  label: string;
  icon?: string;
  order: number;
}

interface SidebarFavoritesProps {
  /** Storage key for localStorage */
  storageKey?: string;
  /** Maximum favorites allowed */
  maxFavorites?: number;
  /** Show add button */
  showAddButton?: boolean;
  /** Collapsed state */
  isCollapsed?: boolean;
}

// Default pages that can be favorited
const AVAILABLE_PAGES = [
  { path: '/dashboard', label: 'لوحة التحكم', icon: '🏠' },
  { path: '/customers', label: 'العملاء', icon: '👥' },
  { path: '/contracts', label: 'العقود', icon: '📋' },
  { path: '/fleet', label: 'الأسطول', icon: '🚗' },
  { path: '/finance/hub', label: 'المركز المالي', icon: '💰' },
  { path: '/finance/invoices', label: 'الفواتير', icon: '🧾' },
  { path: '/finance/payments', label: 'المدفوعات', icon: '💳' },
  { path: '/hr/employees', label: 'الموظفين', icon: '👤' },
  { path: '/hr/attendance', label: 'الحضور', icon: '⏰' },
  { path: '/reports', label: 'التقارير', icon: '📊' },
  { path: '/settings', label: 'الإعدادات', icon: '⚙️' },
];

// Helper functions
const getStoredFavorites = (key: string): FavoriteItem[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const storeFavorites = (key: string, favorites: FavoriteItem[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(favorites));
  } catch (error) {
    console.error('Error storing favorites:', error);
  }
};

// Favorite Item Component (Draggable)
const FavoriteItemComponent: React.FC<{
  item: FavoriteItem;
  isActive: boolean;
  isCollapsed: boolean;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}> = ({ item, isActive, isCollapsed, onRemove, onDragStart, onDragOver, onDrop }) => {
  const [showRemove, setShowRemove] = useState(false);

  return (
    <SidebarMenuItem
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseEnter={() => setShowRemove(true)}
      onMouseLeave={() => setShowRemove(false)}
      className="relative group"
    >
      <SidebarMenuButton 
        asChild 
        isActive={isActive}
        tooltip={isCollapsed ? item.label : undefined}
      >
        <NavLink to={item.path} className="flex items-center gap-2">
          {!isCollapsed && (
            <GripVertical className="h-3 w-3 text-neutral-400 opacity-0 group-hover:opacity-100 cursor-grab" />
          )}
          <span className="text-base">{item.icon || '⭐'}</span>
          {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
        </NavLink>
      </SidebarMenuButton>
      
      {/* Remove button */}
      {!isCollapsed && showRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-destructive/10 text-neutral-400 hover:text-destructive transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </SidebarMenuItem>
  );
};

// Add Favorite Dialog
const AddFavoriteButton: React.FC<{
  favorites: FavoriteItem[];
  onAdd: (path: string, label: string, icon?: string) => void;
  maxFavorites: number;
}> = ({ favorites, onAdd, maxFavorites }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const availableToAdd = AVAILABLE_PAGES.filter(
    page => !favorites.some(f => f.path === page.path)
  );

  const canAddCurrent = !favorites.some(f => f.path === location.pathname);
  const currentPage = AVAILABLE_PAGES.find(p => p.path === location.pathname);

  if (favorites.length >= maxFavorites) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-neutral-500 hover:text-neutral-700"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة مفضلة</span>
          {isOpen ? (
            <ChevronUp className="h-3 w-3 mr-auto" />
          ) : (
            <ChevronDown className="h-3 w-3 mr-auto" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-2 space-y-1 bg-neutral-50 rounded-lg mt-1">
          {/* Add current page */}
          {canAddCurrent && currentPage && (
            <button
              onClick={() => {
                onAdd(currentPage.path, currentPage.label, currentPage.icon);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-white text-sm text-right"
            >
              <Star className="h-4 w-4 text-amber-500" />
              <span>إضافة الصفحة الحالية</span>
            </button>
          )}
          
          {/* Available pages */}
          <div className="max-h-48 overflow-auto space-y-1">
            {availableToAdd.map((page) => (
              <button
                key={page.path}
                onClick={() => {
                  onAdd(page.path, page.label, page.icon);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-white text-sm text-right"
              >
                <span>{page.icon}</span>
                <span>{page.label}</span>
              </button>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Main Component
export const SidebarFavorites: React.FC<SidebarFavoritesProps> = ({
  storageKey = 'sidebar_favorites',
  maxFavorites = 6,
  showAddButton = true,
  isCollapsed = false,
}) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<FavoriteItem | null>(null);
  const location = useLocation();

  // Load favorites on mount
  useEffect(() => {
    setFavorites(getStoredFavorites(storageKey));
  }, [storageKey]);

  // Save favorites when changed
  const saveFavorites = (newFavorites: FavoriteItem[]) => {
    setFavorites(newFavorites);
    storeFavorites(storageKey, newFavorites);
  };

  // Add favorite
  const addFavorite = (path: string, label: string, icon?: string) => {
    if (favorites.length >= maxFavorites) {
      toast.error(`الحد الأقصى ${maxFavorites} مفضلات`);
      return;
    }
    
    if (favorites.some(f => f.path === path)) {
      toast.error('هذه الصفحة موجودة بالفعل في المفضلة');
      return;
    }

    const newFavorite: FavoriteItem = {
      id: `fav_${Date.now()}`,
      path,
      label,
      icon,
      order: favorites.length,
    };

    saveFavorites([...favorites, newFavorite]);
    toast.success('تمت الإضافة للمفضلة');
  };

  // Remove favorite
  const removeFavorite = (id: string) => {
    const newFavorites = favorites
      .filter(f => f.id !== id)
      .map((f, i) => ({ ...f, order: i }));
    saveFavorites(newFavorites);
    toast.success('تمت الإزالة من المفضلة');
  };

  // Drag and drop handlers
  const handleDragStart = (item: FavoriteItem) => (e: React.DragEvent) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetItem: FavoriteItem) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;

    const newFavorites = [...favorites];
    const draggedIndex = newFavorites.findIndex(f => f.id === draggedItem.id);
    const targetIndex = newFavorites.findIndex(f => f.id === targetItem.id);

    // Swap items
    newFavorites.splice(draggedIndex, 1);
    newFavorites.splice(targetIndex, 0, draggedItem);

    // Update order
    newFavorites.forEach((f, i) => {
      f.order = i;
    });

    saveFavorites(newFavorites);
    setDraggedItem(null);
  };

  if (favorites.length === 0 && !showAddButton) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-500" />
        {!isCollapsed && 'المفضلة'}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {favorites
            .sort((a, b) => a.order - b.order)
            .map((item) => (
              <FavoriteItemComponent
                key={item.id}
                item={item}
                isActive={location.pathname === item.path}
                isCollapsed={isCollapsed}
                onRemove={() => removeFavorite(item.id)}
                onDragStart={handleDragStart(item)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(item)}
              />
            ))}
        </SidebarMenu>

        {/* Add button */}
        {showAddButton && !isCollapsed && (
          <AddFavoriteButton
            favorites={favorites}
            onAdd={addFavorite}
            maxFavorites={maxFavorites}
          />
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default SidebarFavorites;

