import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

/**
 * Inicialización del Admin SDK y handle único de Firestore.
 *
 * Vive acá y no en `index.ts` por dos razones:
 *
 *  1. El loader de firebase-functions v7 recorre TODOS los exports del entrypoint para
 *     descubrir functions anidadas. Un `export const db = getFirestore()` lo mandaba a
 *     recorrer el grafo cíclico del cliente de Firestore y reventaba con
 *     "Maximum call stack size exceeded" antes de poder enumerar nada.
 *     El entrypoint ahora exporta únicamente Cloud Functions.
 *
 *  2. Rompe el ciclo de imports que había: index → controllers → services → index.
 *     Antes sólo funcionaba porque `db` se leía en diferido dentro de cada función.
 */
initializeApp();

export const db = getFirestore();
