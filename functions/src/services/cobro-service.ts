import {db} from "../index";
import {ClienteFirestore} from "../modules/models/cliente";

/**
 *
 * @return {Array} clientes in firesotre format
 */
export async function getClientes() {
  const clientes: ClienteFirestore[] = [];
  const clientesRef = db.collection("Cliente");
  await clientesRef.get()
    .then((snapshot) => {
      snapshot.forEach((doc) => {
        const cliente: ClienteFirestore = {
          nombre: doc.data().nombre,
          telefono: doc.data().telefono,
          registradoPor: doc.data().registradoPor,
          uid: doc.data().uid,
        };
        clientes.push(cliente);
      });
    });
  return clientes;
}
