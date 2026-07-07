'use client';

import { motion } from 'framer-motion';
import {
  Siren,
  PhoneCall,
  Stethoscope,
  BellRing,
  MapPin,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmergencyAlertProps {
  reason: string;
  onDismiss: () => void;
  onContinue?: () => void;
}

const ACTIONS = [
  {
    label: 'Call Ambulance — 108',
    sub: 'National emergency no.',
    icon: PhoneCall,
    href: 'tel:108',
    variant: 'destructive' as const,
  },
  {
    label: 'Call Hospital',
    sub: 'Riverside General',
    icon: Siren,
    href: 'tel:+10000000000',
    variant: 'outline' as const,
  },
  {
    label: 'Notify Doctor',
    sub: 'Send to queue',
    icon: BellRing,
    href: undefined,
    variant: 'outline' as const,
  },
  {
    label: 'Nearest ER',
    sub: 'St. Mary’s 24/7',
    icon: MapPin,
    href: undefined,
    variant: 'outline' as const,
  },
];

export function EmergencyAlert({
  reason,
  onDismiss,
  onContinue,
}: EmergencyAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="animate-emergency-glow rounded-2xl border border-destructive/40 bg-destructive/8 p-4 sm:p-5"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive/15 text-destructive">
          <Siren className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Possible Medical Emergency
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {reason}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDismiss}
              aria-label="Dismiss emergency alert"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              const inner = (
                <>
                  <Icon className="size-4" />
                  <span className="text-xs font-semibold leading-tight">
                    {a.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {a.sub}
                  </span>
                </>
              );
              if (a.href) {
                return (
                  <a
                    key={a.label}
                    href={a.href}
                    className={
                      'flex h-auto flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2.5 text-center transition-colors ' +
                      (a.variant === 'destructive'
                        ? 'bg-destructive text-white hover:bg-destructive/90'
                        : 'border border-border bg-card text-foreground hover:bg-accent/50')
                    }
                  >
                    {inner}
                  </a>
                );
              }
              return (
                <Button
                  key={a.label}
                  variant={a.variant}
                  className="h-auto flex-col items-center justify-center gap-0.5 px-2 py-2.5"
                  onClick={() => undefined}
                >
                  {inner}
                </Button>
              );
            })}
          </div>

          {onContinue && (
            <button
              onClick={onContinue}
              className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              This isn’t an emergency, continue chatting
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default EmergencyAlert;
