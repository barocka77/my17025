import { LucideIcon } from 'lucide-react';

export interface Module {
  id: string;
  name: string;
  table: string;
  icon: LucideIcon;
}

export interface Section {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  modules: Module[];
}
