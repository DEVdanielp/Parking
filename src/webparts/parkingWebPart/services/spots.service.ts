import { SpService } from './sp-service';
import type { SPParkingSpot } from '../types';
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";

type SpotsCfg = { webUrl: string; listTitle?: string; listId?: string }; //Configuracion de la lista a la que se apunta

export class SpotsService {
  constructor(private sp: SpService, private cfg: SpotsCfg) {}


  //Funcion para mapear la lista
  private items() {
    const { webUrl, listId, listTitle } = this.cfg;
    return listId ? this.sp.itemsById(listId, webUrl) : this.sp.items(listTitle!, webUrl);
  }

  //Funcion para buscar los parking slots
  all(): Promise<SPParkingSpot[]> {
    return this.items().select('ID','Title','TipoCelda','Activa','Notas')() as Promise<SPParkingSpot[]>;
  }

  //Funcion para añadir los slots
  async addSlot(newSpot: SPParkingSpot) {
    try {
      const body = {
        Title: newSpot.Title,
        TipoCelda: newSpot.TipoCelda,
        Activa: newSpot.Activa,
        Notas: (newSpot.Notas ?? "").trim(),
      };

      const result = await this.items().add(body);
      console.log("Spot agregado con éxito", result);
      return result; 
    } catch (error) {
      console.error("Error al agregar el spot:", error);
      throw new Error("No se pudo agregar el nuevo spot.");
    }
  }

  //Funcion para activar o desactivar slots
  async UpdateSlotStatus(id: number, status: string, title: string){
    try{
      await this.items()
      .getById(id)
      .update({
        Title: title, 
        Activa: status === 'Activa' ? 'No activa' : 'Activa'
      })
      return true
    } catch(error){
      return false
    }
  }

  //Funcion para eliminar slots
  async deleteSlote(id: number){
    try{
      await this.items()
      .getById(id)
      .delete();
      return(true)
    }catch(error){}
  }


}
