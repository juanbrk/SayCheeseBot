import {Context as TelegrafContext} from "telegraf";
import {SceneContextScene, WizardContextWizard} from "telegraf/typings/scenes";
import {Session, MyWizardSession} from "../../src/modules/models/session";

/**
 * Now that we have our session object, we can define our own context object.
 *
 * As always, if we also want to use our own session object, we have to set it
 * here under the `session` property. In addition, we now also have to set the
 * scene object under the `scene` property. As we extend the scene session, we
 * need to pass the type in as a type variable once again.
 *
 * We also have to set the wizard object under the `wizard` property.
 */
export interface ExtendedContext extends TelegrafContext {
	session: Session;
	// declare scene type
	scene: SceneContextScene<ExtendedContext, MyWizardSession>
	// declare wizard type
	wizard: WizardContextWizard<ExtendedContext>
	readonly match: RegExpExecArray | undefined;
}

// Para poder usar WizardScenes Context debe extender a Scenes.WizardContext
// Y para poder utilizar session, debe extender a Scenes.WizardSessionData
