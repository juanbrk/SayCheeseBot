import {CollectionName} from "../../enums/collectionName";
import {Filter} from "../filter";
import {OperadorSortBy} from "../operadorSortBy";

export interface SearchRequestDTO {
    coleccion: CollectionName;
    filtros?: Filter[];
    sortBy?: OperadorSortBy;
    //   searchTerm?: string;
    //   searchFields?: string[];
    //   limit?: number;
}
