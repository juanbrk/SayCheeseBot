import {Context as TelegrafContext} from "telegraf";
import {Session} from "../../src/modules/models/session";

export interface ExtendedContext extends TelegrafContext {
	session: Session;
}
