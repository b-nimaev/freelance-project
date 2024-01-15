import dotenv from 'dotenv';
import rlhubContext from './bot/models/rlhubContext';
import { Scenes, Telegraf, session } from 'telegraf';
dotenv.config()

export const bot = new Telegraf<rlhubContext>(process.env.bot!);

import './app'
import './database'

import home from './bot/views/home.scene';
const stage: any = new Scenes.Stage<rlhubContext>([ home ], { default: 'home' });

bot.use(session())
bot.use(stage.middleware())
bot.start(async (ctx) => {
    await ctx.scene.enter('home')
})
