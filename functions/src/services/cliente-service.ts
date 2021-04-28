import {db} from "../index";
import {ClienteAsEntity, ClienteFirestore, ClientesEntities, ClientesFirestore} from "../modules/models/cliente";

/**
 *
 * @return {Array} clientes in firesotre format
 */
export async function getClientes() : Promise<ClientesFirestore> {
  const clientesSnapshot = await db.collection("Cliente").get();
  const clientes : ClientesFirestore = [];
  clientesSnapshot.forEach((doc) => {
    const cliente : ClienteFirestore = {
      nombre: doc.data().nombre,
      telefono: doc.data().telefono,
      registradoPor: doc.data().registradoPor,
      uid: doc.data().uid,
    };
    clientes.push(cliente);
  });
  return clientes;
}

/**
 * Cuando debemos guardar la instancia de un cliente en una colección, en lugar de
 * obtener el cliente entero, obtenemos un cliente as entity, ya que solo necesitamos
 * el nombre y el uid del cliente en esa colección
 * @return {Promise<ClientesEntities>}
 */
export async function getClientesAsEntities(): Promise<ClientesEntities> {
  const clientesSnapshot = await db.collection("Cliente").get();
  const clientes : ClientesEntities = [];
  clientesSnapshot.forEach((doc) => {
    const cliente : ClienteAsEntity = {
      nombre: doc.data().nombre,
      uid: doc.data().uid,
    };
    clientes.push(cliente);
  });
  return clientes;
}

/**
 * Necesitamos obtener el cliente según su UID
 *
 * @param {string} clienteUID uid  del cliente
 * @return {Promise<ClienteAsEntity>} cliente
 */
export async function getCliente(clienteUID: string): Promise<ClienteAsEntity> {
  const docCliente = await db.collection("Cliente").doc(clienteUID).get();
  if (!docCliente.exists) {
    throw new Error(`No se encontró al cliente con el uid ${clienteUID}`);
  } else {
    const cliente : ClienteAsEntity = {
      nombre: docCliente.data()!.nombre,
      uid: docCliente.data()!.uid,
    };
    return cliente;
  }
}