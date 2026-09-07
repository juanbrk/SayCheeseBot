/**
 * Las dos socias del estudio.
 *
 * ⚠️ DEUDA CONOCIDA — los nombres de campo en Firestore quedaron con "Fer"
 *
 * Hasta 2023 la otra socia era FER. Al reemplazarla por MARIAN se renombró el enum
 * (miembro y valor) pero NO los campos persistidos en Firestore, que siguen siendo:
 *
 *   - `ferDebeAFlor`        (colección Resumen)  → lo que MARIAN le debe a Flor
 *   - `florDebeAFer`        (colección Resumen)  → lo que Flor le debe a MARIAN
 *   - `totalCobradoPorFer`  (colección Resumen)  → total cobrado por MARIAN
 *   - `leCorrespondeAFer`   (colección Balance)  → lo que le corresponde a MARIAN
 *
 * O sea: donde el código dice "Fer" en un nombre de campo, hay que leer MARIAN.
 * Se dejó así a propósito, para no arrastrar una migración de datos al revivir el bot.
 *
 * Renombrarlos está anotado en `roadmap.md` como **D1**.
 *
 * El VALOR del enum sí se persiste (en `cobradoPor`, `asignadoA`, `realizadoPor`) y
 * viaja como `callback_data` de los botones de visualización, así que cambiarlo sólo
 * fue seguro porque la base se vació al revivir el bot. No repetir el cambio en
 * caliente sin migrar los documentos.
 */
export enum Socias {
    MARIAN = "Marian",
    FLOR = "Flor"
}
