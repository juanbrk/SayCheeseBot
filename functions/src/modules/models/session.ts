import {WizardSession, WizardSessionData} from "telegraf/typings/scenes";
import {EdicionInformacionCliente, RegistroNuevoCliente} from "./cliente";
import {CobroSession} from "./cobro";
import {ListadoResumenes} from "./resumen";


/**
 * We can still extend the regular session object that we can use on the
 * context. However, as we're using wizards, we have to make it extend
 * `WizardSession`.
 *
 * It is possible to pass a type variable to `WizardSession` if you also want to
 * extend the wizard session as we do above.
 */
export interface Session extends WizardSession<MyWizardSession> {
	page?: number;
    counter?: number;
	nuevoCliente?: RegistroNuevoCliente;
	cobro?: CobroSession;
	edicionInformacionCliente?: EdicionInformacionCliente;
	resumenes?: ListadoResumenes;
}

/**
 * It is possible to extend the session object that is available to each wizard.
 * This can be done by extending `WizardSessionData` and in turn passing your
 * own interface as a type variable to `WizardSession` and to
 * `WizardContextWizard`.
 */
interface MyWizardSession extends WizardSessionData {
	// will be available under `ctx.scene.session.myWizardSessionProp`
	myWizardSessionProp: number
  }
