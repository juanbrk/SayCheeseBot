import {MenuTemplate} from "telegraf-inline-menu/dist/source";
import {ExtendedContext} from "../../../../config/context/myContext";
import {TipoImpresionEnConsola} from "../../../modules/enums/tipoImpresionEnConsola";
import {imprimirEnConsola} from "../../../modules/utils/general";
import {armarResumen} from "../../actions/resumen-actions";
import {botonesVueltaAtras} from "../general";
import {generarResumenMensualUID} from "../../../modules/utils/resumen";

import {MESES} from "../choices";
import {db} from "../../..";
import {CollectionName} from "../../../modules/enums/collectionName";
/**
 * Presentamos el resumen del mes y año seleccionado, y la opción de saldar deudas.
 */
export const menu = new MenuTemplate<ExtendedContext>(async (ctx) => {
  const indiceMesSeleccionado: number = +ctx.match![2];
  const mesEnPalabras: string = MESES[indiceMesSeleccionado];
  const anoSeleccionado: string = (ctx.session.visualizacionCobro && "anoSeleccionado" in ctx.session.visualizacionCobro) ? ctx.session.visualizacionCobro.anoSeleccionado! : "2021";

  const refResumenesAnteriores = await db.collection(CollectionName.RESUMEN).where("mes", "<", indiceMesSeleccionado).where("year", "==", (+anoSeleccionado)).get();
  const resumenesAnteriores: any[] = [];
  refResumenesAnteriores.docs.forEach((resumen) => {
    resumenesAnteriores.push(resumen.data());
  });

  imprimirEnConsola("Generando resumen -> Mes seleccionado", TipoImpresionEnConsola.DEBUG, {mes: mesEnPalabras});

  const uidResumen = generarResumenMensualUID(indiceMesSeleccionado, anoSeleccionado!);
  const textoResumen = await armarResumen(ctx, uidResumen);
  return {text: textoResumen, parse_mode: "HTML"};
});

menu.manualRow(botonesVueltaAtras);
