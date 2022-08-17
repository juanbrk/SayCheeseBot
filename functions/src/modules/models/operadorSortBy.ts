import {TipoOrdenadoQuery} from "../enums/tipoOrdenadoQuery";

export interface OperadorSortBy {
  campo: string;
  tipo: TipoOrdenadoQuery;
}
