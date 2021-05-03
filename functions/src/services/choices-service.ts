import {db} from "..";
import {Choices} from "../modules/enums/choices";
import {CollectionName} from "../modules/enums/collectionName";

/**
 * Cuando debemos guardar la instancia de un cliente en una colección, en lugar de
 * obtener el cliente entero, obtenemos un cliente as entity, ya que solo necesitamos
 * el nombre y el uid del cliente en esa colección
 * @return {Promise<Choices>}
 */
export async function getCamposCliente(): Promise<any> {
  const camposClienteRef = db.collection(CollectionName.CHOICES).doc(Choices.CAMPOS_CLIENTE);
  const doc = await camposClienteRef.get();
  if (!doc.exists) {
    console.log("No se encontraron los campos del cliente!");
  } else {
    return doc.data();
  }
}
