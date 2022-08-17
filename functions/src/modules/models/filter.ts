import {QueryOperators} from "../enums/QueryOperators";
/**
 *
 */
export class Filter {
  private _fieldName: string;
  private _fieldValue: string;
  private _queryOperator: QueryOperators;

  /**
   *
   * @param {string} fieldName nombre del campo de la db a filtrar
   * @param {QueryOperators} operator operador a utilizar para el filtrado
   * @param {any} fieldValue valor del campo por el cual filtrar
   */
  constructor(fieldName: string, operator: QueryOperators, fieldValue: any) {
    this._fieldName = fieldName;
    this._queryOperator = operator;
    this._fieldValue = fieldValue;
  }
  /**
   *
   */
  get fieldName() {
    return this._fieldName;
  }
  /**
  * @param {string} value
  */
  set fieldName(value) {
    this._fieldName = value;
  }
  /**
   *
   */
  get fieldValue() {
    return this._fieldValue;
  }
  /**
   * @param {string} value
   */
  set fieldValue(value: string) {
    this._fieldValue = value;
  }
  /**
   *
   */
  get queryOperator(): QueryOperators {
    return this._queryOperator;
  }
  /**
   * @param {QueryOperators} value
   */
  set queryOperator(value: QueryOperators) {
    this._queryOperator = value;
  }
}
