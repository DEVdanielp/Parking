// services/sp-service.ts
import type { SPFI } from '@pnp/sp';

// PnPjs: habilita webs, lists, items
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';

export class SpService {
  constructor(
    private readonly sp: SPFI,
    private readonly spFor: (webUrl: string) => SPFI // 👉 fábrica para otro sitio
  ) {}

  /** items por título, opcionalmente en otro webUrl */
  items(listTitle: string, webUrl?: string) {
    const root = webUrl ? this.spFor(webUrl) : this.sp;
    return root.web.lists.getByTitle(listTitle).items;
  }

  /** items por Id, opcionalmente en otro webUrl */
  itemsById(listId: string, webUrl?: string) {
    const root = webUrl ? this.spFor(webUrl) : this.sp;
    return root.web.lists.getById(listId).items;
  }

  getById<T>(listTitle: string, id: number, webUrl?: string): Promise<T> {
    const root = webUrl ? this.spFor(webUrl) : this.sp;
    return root.web.lists.getByTitle(listTitle).items.getById(id)();
  }

  updateById<T>(listTitle: string, id: number, partial: Partial<T>, webUrl?: string) {
    const root = webUrl ? this.spFor(webUrl) : this.sp;
    return root.web.lists.getByTitle(listTitle).items.getById(id).update(partial);
  }
}
