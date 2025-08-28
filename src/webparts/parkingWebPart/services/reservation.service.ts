import { SpService } from './sp-service';
import type {
  SPReservation, SPParkingSpot, SPSettings,
  AvailabilityCell, TurnType, VehicleType
} from '../types';
import { SpotsService } from './spots.service';

type ResCfg = { webUrl: string; listTitle?: string; listId?: string };
const MOTO_SLOTS = 4;

export class ReservationsService {
  constructor(private sp: SpService, private spotsSvc: SpotsService, private cfg: ResCfg) {}

  //Funcion que apunta a lista indicada
  private items() {
    const { webUrl, listId, listTitle } = this.cfg;
    return listId ? this.sp.itemsById(listId, webUrl) : this.sp.items(listTitle!, webUrl);
  }

  //Obtener turnos por la fecha indicada
  async getByDateTurn(date: string, turn: TurnType): Promise<SPReservation[]> {
    const filter = `Date eq '${date}' and Turn eq '${turn}' and Status eq 'Activa'`;
    const items = await this.items()
      .select('ID','Title','Date','Turn','SpotIdId','VehicleType','Status')
      .filter(filter)();
    return items as SPReservation[];
  }

  //Funcion para crear una reserva
  async create(dto: {
    Title: string;
    Date: string;  
    Turn: string;
    SpotIdId: number; //ID de la celda en la que se reservo
    VehicleType: string;
    Status?: 'Activa' | 'Cancelada';
  }) {
    if (!dto.Status) dto.Status = 'Activa';
    console.log(dto)
    return this.items().add(dto);
  }

  async cancel(id: number) {
    return this.items().getById(id).update({ Status: 'Cancelada' });
  }

  //Funcion para obtener celdas disponibles
  async getAvailability(date: string, turn: TurnType): Promise<AvailabilityCell[]> {

    const [spots, res] = await Promise.all([
      this.spotsSvc.all(),
      this.getByDateTurn(date, turn), // solo 'Activa'
    ]);


    const bySpot = new Map<number, SPReservation[]>();
    for (const r of res) {
      const arr = bySpot.get(r.SpotIdId) ?? [];
      arr.push(r);
      bySpot.set(r.SpotIdId, arr);
    }

    const cells: AvailabilityCell[] = spots
      .filter(s => s.Activa === "Activa") 
      .map(s => {
        const list = bySpot.get(s.ID!) ?? [];

        // --- Celda: Carro ---
        if (s.TipoCelda === "Carro") {
          const hasCar = list.some(x => x.VehicleType === "Carro");
          return {
            spot: s,
            carBlocked: hasCar,
            motoSlotsFree: 0,
            isCarAvailable: !hasCar,
            isMotoAvailable: false,
          };
        }

        // --- Celda: Moto ---
        if (s.TipoCelda === "Moto") {
          const motoCount = list.filter(x => x.VehicleType === "Moto").length;
          const motoFree = Math.max(0, MOTO_SLOTS - motoCount); // MOTO_SLOTS = 4

          return {
            spot: s,
            carBlocked: true,              
            motoSlotsFree: motoFree,       
            isCarAvailable: false,         
            isMotoAvailable: motoFree > 0, 
          };
        }

        // Si llega un tipo desconocido, lo marcamos como no disponible
        return {
          spot: s,
          carBlocked: true,
          motoSlotsFree: 0,
          isCarAvailable: false,
          isMotoAvailable: false,
        };
      });

    return cells;
  }

  //Funcion para obtener las reservas de un usuario
  async getUserReserves(userEmail: string, initial?: string, final?: string){
    const initialDate = new Date(initial + 'T00:00:00');
    const finalDate = new Date(final + 'T00:00:00');
    const startIso = initialDate.toISOString();
    const endIso   = finalDate.toISOString();
    const filter = `Title eq '${userEmail}' and Status eq 'Activa' ` + `and Date ge datetime'${startIso}' and Date lt datetime'${endIso}'`;;  // Filtro de reservas activas para el dia en el que intenta reservar
    const items = await this.items().select('Date', 'Turn', 'SpotId/Title', 'VehicleType', 'Status').filter(filter).expand('SpotId')();  // Obtiene los items que coincidan con el filtro
    return items as SPReservation[];  // Devuelve el número de reservas activas
  }



//Funcion para hacer validaciones antes de agendar
  async validateBeforeCreate(date: string, turn: TurnType, userEmail: string, vehicle: VehicleType, spot: SPParkingSpot, settings: SPSettings
  ) {
    const now = new Date();
    const target = new Date(date + 'T00:00:00');
    if (target < new Date(now.toDateString())) throw new Error('La fecha debe ser hoy o futura.');

    const visibleLimit = new Date(new Date(now.toDateString()).getTime() + settings.VisibleDays * 86400000);
    if (target > visibleLimit) throw new Error(`La fecha está fuera de la ventana visible (${settings.VisibleDays} días).`);

    // Revalida disponibilidad puntual
    const avail = await this.getAvailability(date, turn);
    const cell = avail.filter(a => a.spot.ID === spot.ID);
    if (!cell.length) throw new Error('Celda no encontrada o inactiva.');
    if (vehicle === 'Carro' && !cell[0].isCarAvailable) throw new Error('Sin cupo para carro en esa celda/turno.');
    if (vehicle === 'Moto' && !cell[0].isMotoAvailable) throw new Error('Sin cupo para moto en esa celda/turno.');

    if (vehicle === 'Moto') {
      // Contar las reservas de moto en el mismo día
      const motoReservations = await this.getByDateTurn(date, turn);
      const motoCount = motoReservations.filter(r => r.VehicleType === 'Moto' && r.SpotIdId === spot.ID).length;
      if (motoCount >= 4) throw new Error('El estacionamiento de motos ya tiene 4 reservas para este día.');
    }

     const activeReservations = await this.getUserActiveCount(userEmail, date);
      if (activeReservations >= 1) {
        throw new Error('Ya tienes una reserva activa para este día.');
    }

  }

//Funcion para contar la cantidad de reservas de un usuario
  async getUserActiveCount(userEmail: string, dateStr: string): Promise<number> {
    const start = new Date(`${dateStr}T00:00:00Z`);          // inicio día en UTC
    const end   = new Date(start.getTime() + 24 * 60 * 60 * 1000); // día siguiente
    const startIso = start.toISOString();
    const endIso   = end.toISOString();

    const filter = `Title eq '${userEmail}' and Status eq 'Activa' ` + `and Date ge datetime'${startIso}' and Date lt datetime'${endIso}'`;;  // Filtro de reservas activas para el dia en el que intenta reservar
    const items = await this.items().select('Id').filter(filter)();  // Obtiene los items que coincidan con el filtro
    return items.length;  // Devuelve el número de reservas activas
  }
}
