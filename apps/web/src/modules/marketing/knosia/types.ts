// Knosia Marketing Page Types
// Target: B2B Intelligence Clients

export interface ModeCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  example: string;
}

export interface JourneyStep {
  day: string;
  title: string;
  description: string;
  highlight?: boolean;
}

export interface CompetitorPosition {
  name: string;
  x: number; // 0-100: Reactive → Proactive
  y: number; // 0-100: Manual → Autonomous
  isUs?: boolean;
}

export interface FeatureComparison {
  feature: string;
  traditional: string;
  knosia: string;
}

export interface BriefingItem {
  type: 'positive' | 'warning' | 'target' | 'insight';
  icon: string;
  title: string;
  detail: string;
  actions?: string[];
}
