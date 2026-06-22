/**
 * Category Selector Component
 * Allows user to select document category
 */

import { motion } from 'framer-motion';
import { Building2, Car, FileText, Users } from 'lucide-react';
import type { CategoryInfo } from '@/types/legal-document-generator';

interface CategorySelectorProps {
  categories: CategoryInfo[];
  onSelect: (categoryId: string) => void;
}

const categoryIcons: Record<string, any> = {
  insurance: Building2,
  traffic: Car,
  general: FileText,
  customer: Users,
};

export function CategorySelector({ categories, onSelect }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {categories.map((category, index) => {
        const Icon = categoryIcons[category.id] || FileText;

        return (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <button
              onClick={() => onSelect(category.id)}
              className="w-full h-full"
            >
              <div className="p-6 border-2 border-dashed rounded-xl hover:border-primary transition-all duration-200 hover:shadow-lg bg-card">
                <div className={`w-16 h-16 ${category.color} rounded-2xl flex items-center justify-center text-3xl mb-4`}>
                  {category.icon}
                </div>
                <h3 className="text-lg font-bold mb-1">{category.name_ar}</h3>
                <p className="text-sm text-muted-foreground mb-3">{category.name_en}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {category.description_ar}
                </p>
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}
