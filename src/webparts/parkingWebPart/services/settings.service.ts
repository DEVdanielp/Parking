// services/settings.service.ts
import { SpService } from './sp-service';
import type { SPSettings } from '../types';

type SettingsCfg = { webUrl: string; listTitle?: string; listId?: string };

export class SettingsService {
  constructor(private sp: SpService, private cfg: SettingsCfg) {}

  private items() {
    const { webUrl, listId, listTitle } = this.cfg;
    return listId
      ? this.sp.itemsById(listId, webUrl)
      : this.sp.items(listTitle!, webUrl);
  }

  async get(): Promise<SPSettings> {
    const items = await this.items().select('Id','VisibleDays','MaxAdvanceHours','MaxUserTurns').top(1)();
    if (items.length) return items[0] as SPSettings;

    // crea defaults si la lista está vacía
    const defaults: SPSettings = {Id: 1,VisibleDays: 14, MaxAdvanceHours: 72, MaxUserTurns: 3 };
    const res = await this.items().add({ Title: 'Defaults', ...defaults });
    return await res.item() as SPSettings;
  }

  async update(partial: Partial<SPSettings>) {
    const items = await this.items().select('Id').top(1)();
    if (!items.length) throw new Error('La lista de settings no tiene elementos.');
    return this.items().getById(items[0].Id).update(partial);
  }
}
