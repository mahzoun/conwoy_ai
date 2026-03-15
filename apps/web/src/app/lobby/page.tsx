import { MatchLobby } from '../../components/match/MatchLobby';

export const metadata = {
  title: 'Game Lobby — Conwoy AI',
};

export default function LobbyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <MatchLobby />
    </div>
  );
}
