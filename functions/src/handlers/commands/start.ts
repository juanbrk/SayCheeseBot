import { Context } from 'telegraf';
import {darLaBienvenida} from '../../modules/utils/mensajes';

export async function startCommand(ctx: Context, sePresionoStart: boolean){
    return darLaBienvenida(ctx, sePresionoStart);
}