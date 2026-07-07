'use client';

import { motion } from 'framer-motion';
import {
  Siren,
  PhoneCall,
  MapPin,
  Navigation,
  LifeBuoy,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Hospital {
  name: string;
  type: string;
  distance: string;
  eta: string;
  phone: string;
}

const HOSPITALS: Hospital[] = [
  {
    name: 'Riverside General Hospital',
    type: 'Multi-specialty',
    distance: '1.2 km',
    eta: '~5 min',
    phone: 'tel:+10000000001',
  },
  {
    name: 'St. Mary’s Emergency Care',
    type: '24/7 Emergency',
    distance: '2.4 km',
    eta: '~9 min',
    phone: 'tel:+10000000002',
  },
  {
    name: 'Sunrise Family Clinic',
    type: 'Outpatient',
    distance: '0.8 km',
    eta: '~3 min',
    phone: 'tel:+10000000003',
  },
];

export function SupportView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Emergency banner */}
      <div className="animate-emergency-glow rounded-2xl border border-destructive/40 bg-destructive/8 p-5 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-destructive/15 text-destructive">
              <Siren className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Need immediate help?
              </h2>
              <p className="text-sm text-muted-foreground">
                National ambulance number — available 24/7
              </p>
            </div>
          </div>
          <a href="tel:108" className="w-full sm:w-auto">
            <Button
              variant="destructive"
              size="lg"
              className="w-full rounded-full sm:w-auto"
            >
              <PhoneCall className="size-4" />
              Call Ambulance — 108
            </Button>
          </a>
        </div>
      </div>

      {/* Nearby hospitals */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
            <LifeBuoy className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Nearby hospitals
            </h2>
            <p className="text-xs text-muted-foreground">
              Closest facilities to Riverside Community Clinic.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {HOSPITALS.map((h) => (
            <motion.div
              key={h.name}
              whileHover={{ y: -1 }}
              className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <MapPin className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {h.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{h.type}</span>
                    <span className="opacity-50">·</span>
                    <span>{h.distance}</span>
                    <span className="opacity-50">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {h.eta}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={h.phone} className="inline-flex">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                  >
                    <PhoneCall className="size-3.5" />
                    Call
                  </Button>
                </a>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => undefined}
                >
                  <Navigation className="size-3.5" />
                  Directions
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <p className="px-1 text-center text-xs text-muted-foreground">
        In a life-threatening emergency, call 108 immediately. Don’t wait for
        an AI message.
      </p>
    </motion.div>
  );
}

export default SupportView;
