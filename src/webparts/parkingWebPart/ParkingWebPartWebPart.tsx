// ParkingWebPart.ts
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { spfi, SPFI } from '@pnp/sp';
import { SPFx } from '@pnp/sp/behaviors/spfx';
import AppProviders from './context/AppProviders';
import App from './components/App/App';

export interface IParkingWebPartProps {}

export default class ParkingWebPart extends BaseClientSideWebPart<IParkingWebPartProps> {
  private _sp!: SPFI;

  public render(): void {
    this._sp ??= spfi().using(SPFx(this.context));

    // 👉 configura dónde están tus listas (otro sitio)
    const config = {
      settings: {
        webUrl: 'https://estudiodemoda.sharepoint.com/sites/TransformacionDigital/IN/Test', // el sitio donde vive la lista
        // listId: 'aba215d0-3a44-4d6b-8bd5-1672b06b28ed', // opcional si prefieres por GUID
        listTitle: 'Settings', // o usa el GUID arriba
      },
      spots: {
        webUrl: 'https://estudiodemoda.sharepoint.com/sites/TransformacionDigital/IN/Test',
        listTitle: 'ParkingSlots',
      },
      reservations: {
        webUrl: 'https://estudiodemoda.sharepoint.com/sites/TransformacionDigital/IN/Test',
        listTitle: 'Reservations',
      },
    };

    const element = (
      <AppProviders sp={this._sp} context={this.context} config={config}>
        <App />
      </AppProviders>
    );
    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }
}
