export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
              C
            </div>
            <span className="text-sm text-muted-foreground">
              Conwoy AI — Competitive Conway&apos;s Game of Life
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>Built with Next.js + Solidity</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
