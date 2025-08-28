// context/AppProviders.tsx
import * as React from 'react';
import type { SPFI } from '@pnp/sp';
import { spfi } from '@pnp/sp';
import { SPFx } from '@pnp/sp/behaviors/spfx';
import type { WebPartContext } from '@microsoft/sp-webpart-base';

import { SpService } from '../services/sp-service';
import { SettingsService } from '../services/settings.service';
import { SpotsService } from '../services/spots.service';
import { ReservationsService } from '../services/reservation.service';
import type { SPSettings } from '../types';

export interface ListsConfig {
  settings: { webUrl: string; listTitle?: string; listId?: string };
  spots: { webUrl: string; listTitle?: string; listId?: string };
  reservations: { webUrl: string; listTitle?: string; listId?: string };
}

export interface AppDeps {
  sp: SPFI;
  spSvc: SpService;
  settingsSvc: SettingsService;
  spotsSvc: SpotsService;
  reservationsSvc: ReservationsService;
}

export const DepsCtx = React.createContext<AppDeps | null>(null);
export const SettingsCtx = React.createContext<SPSettings | null>(null);

export default function AppProviders({
  sp,
  context,
  config,
  children,
}: React.PropsWithChildren<{ sp: SPFI; context: WebPartContext; config: ListsConfig }>) {

  // 👉 fábrica para obtener un SPFI apuntando a OTRO web
  const spFor = React.useCallback((webUrl: string) => spfi(webUrl).using(SPFx(context)), [context]);

  const spSvc = React.useMemo(() => new SpService(sp, spFor), [sp, spFor]);

  const settingsSvc = React.useMemo(
    () => new SettingsService(spSvc, { ...config.settings }),
    [spSvc, config.settings]
  );
  const spotsSvc = React.useMemo(
    () => new SpotsService(spSvc, { ...config.spots }),
    [spSvc, config.spots]
  );
  const reservationsSvc = React.useMemo(
    () => new ReservationsService(spSvc, spotsSvc, { ...config.reservations }),
    [spSvc, spotsSvc, config.reservations]
  );

  const deps: AppDeps = { sp, spSvc, settingsSvc, spotsSvc, reservationsSvc };
  const [settings, setSettings] = React.useState<SPSettings | null>(null);

  React.useEffect(() => { settingsSvc.get().then(setSettings).catch(() => setSettings(null)); }, [settingsSvc]);

  return (
    <DepsCtx.Provider value={deps}>
      <SettingsCtx.Provider value={settings}>
        {children}
      </SettingsCtx.Provider>
    </DepsCtx.Provider>
  );
}

export function useDeps() {
  const ctx = React.useContext(DepsCtx);
  if (!ctx) throw new Error('DepsCtx not provided');
  return ctx;
}
export function useSettings() {
  return React.useContext(SettingsCtx);
}
