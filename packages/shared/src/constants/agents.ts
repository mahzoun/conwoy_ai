import { Agent, AgentId } from '../types/game';

export const AGENTS: Record<AgentId, Agent> = {
  architect: {
    id: 'architect',
    name: 'Architect',
    description: 'Masters of stable structures. Place immovable fortresses that outlast the chaos.',
    allowedPatterns: ['block', 'boat', 'tub'],
    canRotate: false,
    canMirror: false,
    color: '#60a5fa',
    bgColor: '#1e3a5f',
  },

  swarm: {
    id: 'swarm',
    name: 'Swarm',
    description: 'Mobile and aggressive. Deploy gliders and spaceships that cross the board.',
    allowedPatterns: ['glider', 'lwss'],
    canRotate: true,
    canMirror: true,
    color: '#34d399',
    bgColor: '#064e3b',
  },

  chaos: {
    id: 'chaos',
    name: 'Chaos',
    description: 'Unpredictable oscillators that create havoc. Disrupts enemy patterns.',
    allowedPatterns: ['blinker', 'toad', 'beacon'],
    canRotate: true,
    canMirror: false,
    color: '#f87171',
    bgColor: '#450a0a',
  },

  engineer: {
    id: 'engineer',
    name: 'Engineer',
    description: 'Versatile and adaptive. Uses a combination of structures and movers.',
    allowedPatterns: ['block', 'glider', 'blinker', 'boat'],
    canRotate: true,
    canMirror: true,
    color: '#fbbf24',
    bgColor: '#451a03',
  },
};

export const AGENT_LIST: Agent[] = Object.values(AGENTS);

export function getAgent(id: AgentId): Agent {
  const agent = AGENTS[id];
  if (!agent) {
    throw new Error(`Unknown agent: ${id}`);
  }
  return agent;
}
