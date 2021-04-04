import { Context } from 'telegraf';
import {mostrarUsoDeInline} from '../../modules/utils/mensajes';

export async function ejemploCommand(ctx: Context){
    return mostrarUsoDeInline(ctx);
}