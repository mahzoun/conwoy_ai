'use client';

import { AgentId, Agent, PatternId } from '@conwoy/shared';
import { AGENTS, AGENT_LIST, PATTERNS } from '@conwoy/shared';
import { cn } from '../../lib/utils';

interface AgentSelectorProps {
  selectedAgentId: AgentId | null;
  onSelect: (agentId: AgentId) => void;
  disabled?: boolean;
  playerSlot: 1 | 2;
}

export function AgentSelector({ selectedAgentId, onSelect, disabled, playerSlot }: AgentSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Choose Your Agent
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {AGENT_LIST.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={selectedAgentId === agent.id}
            onSelect={() => !disabled && onSelect(agent.id)}
            disabled={disabled}
            playerSlot={playerSlot}
          />
        ))}
      </div>
    </div>
  );
}

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  playerSlot: 1 | 2;
}

function AgentCard({ agent, isSelected, onSelect, disabled, playerSlot }: AgentCardProps) {
  const playerColor = playerSlot === 1 ? '#3b82f6' : '#ef4444';

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        'hover:border-primary/50 hover:bg-accent/50',
        isSelected
          ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
          : 'border-border bg-card',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: agent.bgColor, border: `1px solid ${agent.color}30` }}
        >
          {getAgentEmoji(agent.id)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color: agent.color }}>
              {agent.name}
            </span>
            {isSelected && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                Selected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {agent.description}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {agent.allowedPatterns.map(pid => (
              <span
                key={pid}
                className="text-xs px-1.5 py-0.5 rounded border border-border/50 bg-muted text-muted-foreground"
              >
                {PATTERNS[pid]?.name ?? pid}
              </span>
            ))}
            {(agent.canRotate || agent.canMirror) && (
              <span className="text-xs px-1.5 py-0.5 rounded border border-border/50 bg-muted text-blue-400">
                {agent.canRotate && agent.canMirror ? 'Rotate+Mirror' : agent.canRotate ? 'Rotate' : 'Mirror'}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function getAgentEmoji(id: AgentId): string {
  const emojis: Record<AgentId, string> = {
    architect: '🏛️',
    swarm: '🌊',
    chaos: '⚡',
    engineer: '⚙️',
  };
  return emojis[id] ?? '?';
}
