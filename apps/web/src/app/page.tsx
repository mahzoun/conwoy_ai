import Link from 'next/link';
import { AGENTS, AGENT_LIST } from '@conwoy/shared';

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-red-500/5" />

        {/* Animated grid background */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
          }}
        />

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary mb-8">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            On-chain competitive cellular automata
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6">
            <span className="gradient-text">Conwoy</span>
            <span className="text-foreground"> AI</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Deploy patterns. Watch them evolve. Conquer the board.
            A competitive 2-player version of Conway&apos;s Game of Life with on-chain wagering.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/lobby"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
            >
              Play Now →
            </Link>
            <Link
              href="/lobby?tab=live"
              className="px-8 py-4 bg-card border border-border text-foreground rounded-xl font-bold text-lg hover:bg-accent transition-colors"
            >
              Watch Live Games
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Choose Your Agent',
                description: 'Pick a faction: Architect, Swarm, Chaos, or Engineer. Each has unique patterns and abilities.',
                icon: '🎭',
              },
              {
                step: '2',
                title: 'Deploy Patterns',
                description: 'Place cellular automata patterns in your half of the board. Plan your strategy carefully.',
                icon: '🎯',
              },
              {
                step: '3',
                title: 'Watch & Win',
                description: 'Conway\'s rules run automatically for up to 500 generations. The player with the most live cells wins.',
                icon: '⚡',
              },
            ].map(item => (
              <div key={item.step} className="text-center p-6 rounded-xl border border-border bg-card/50">
                <div className="text-4xl mb-4">{item.icon}</div>
                <div className="text-xs text-primary font-bold uppercase tracking-wider mb-2">
                  Step {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Choose Your Faction</h2>
          <p className="text-center text-muted-foreground mb-12">
            Each agent brings a unique playstyle and set of patterns
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AGENT_LIST.map(agent => (
              <div
                key={agent.id}
                className="p-5 rounded-xl border bg-card/50 hover:bg-card transition-colors"
                style={{ borderColor: `${agent.color}30` }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                  style={{ backgroundColor: agent.bgColor, border: `1px solid ${agent.color}40` }}
                >
                  {agent.id === 'architect' ? '🏛️' :
                   agent.id === 'swarm' ? '🌊' :
                   agent.id === 'chaos' ? '⚡' : '⚙️'}
                </div>
                <h3 className="font-bold text-lg mb-1" style={{ color: agent.color }}>
                  {agent.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {agent.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {agent.allowedPatterns.map(p => (
                    <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-red-500/10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Battle?</h2>
          <p className="text-muted-foreground mb-8">
            Connect your wallet and start a match. Free games available, or wager ETH for higher stakes.
          </p>
          <Link
            href="/lobby"
            className="inline-flex px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all hover:scale-105"
          >
            Enter the Arena →
          </Link>
        </div>
      </section>
    </div>
  );
}
