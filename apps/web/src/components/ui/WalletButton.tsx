'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { cn } from '../../lib/utils';

interface WalletButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function WalletButton({ className, size = 'md', label }: WalletButtonProps) {
  const sizeClasses = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className={cn(
                      'bg-primary text-primary-foreground rounded-lg font-semibold transition-all hover:opacity-90 active:scale-95',
                      sizeClasses[size],
                      className
                    )}
                  >
                    {label ?? 'Connect Wallet'}
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className={cn(
                      'bg-destructive text-destructive-foreground rounded-lg font-semibold',
                      sizeClasses[size],
                      className
                    )}
                  >
                    Wrong network
                  </button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  <button
                    onClick={openChainModal}
                    className={cn(
                      'flex items-center gap-1.5 bg-secondary text-secondary-foreground rounded-lg font-medium transition-colors hover:bg-accent',
                      sizeClasses[size]
                    )}
                    type="button"
                  >
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        alt={chain.name ?? 'Chain icon'}
                        src={chain.iconUrl}
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    {chain.name}
                  </button>

                  <button
                    onClick={openAccountModal}
                    type="button"
                    className={cn(
                      'bg-secondary text-secondary-foreground rounded-lg font-medium transition-colors hover:bg-accent',
                      sizeClasses[size],
                      className
                    )}
                  >
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
