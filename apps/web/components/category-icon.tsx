import {
  Bell, Braces, Brain, ChartLine, Cpu, FlaskConical, GitBranch, KeyRound,
  Package, Palette, Plug, Server, Workflow, Wrench, type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  'key-round': KeyRound, brain: Brain, plug: Plug, 'git-branch': GitBranch, workflow: Workflow,
  wrench: Wrench, braces: Braces, 'chart-line': ChartLine, cpu: Cpu, bell: Bell, palette: Palette,
  server: Server, 'flask-conical': FlaskConical, package: Package,
};

export function CategoryIcon({ name, className, strokeWidth = 1.75 }: { name: string; className?: string; strokeWidth?: number }) {
  const Icon = ICONS[name] ?? Package;
  return <Icon aria-hidden className={className} strokeWidth={strokeWidth} />;
}
