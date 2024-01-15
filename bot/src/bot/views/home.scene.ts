import { Composer, Scenes } from "telegraf";
import { ExtraEditMessageText } from "telegraf/typings/telegram-types";
import rlhubContext from "../models/rlhubContext";
import { IUser, User } from "../../models/IUser";
import { OpenAI } from "openai";
import { bot } from "../..";
const openai = new OpenAI({ apiKey: process.env.openai, });
const handler = new Composer<rlhubContext>();
const home = new Scenes.WizardScene("home", handler);

export async function greeting(ctx: rlhubContext, reply?: boolean) {

    const message: string = `Я таролог, маг и предсказатель. Я использую таро-карты, чтобы предсказывать будущее и помочь людям в их жизни. Как я могу помочь?`

    const extra: ExtraEditMessageText = {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Начать', callback_data: 'start-chat' }]
            ]
        }
    }

    try {

        const user = await User.findOne({ id: ctx.from.id })

        if (!user) {

            let userdata: any = ctx.from
            userdata.utm = ctx.scene.session.ref

            await new User(ctx.from).save()

        }

        if (reply) { return ctx.reply(message) }

        ctx.updateType === 'callback_query' ? await ctx.editMessageText(message) : ctx.reply(message)

    } catch (err) {

        console.log(err)

    }
}

home.start(async (ctx: rlhubContext) => {

    let ref: string
    if (ctx.startPayload) {

        ref = ctx.startPayload.replace('ref_', '')

        console.log(ref)

    }

    ctx.scene.session.ref = ref

    try {

        await greeting(ctx)

    } catch (err) {
        console.log(err)
    }
});

home.on("message", async (ctx: rlhubContext) => {
    try {

        const user = await User.findOne({ id: ctx.from.id })

        if (!user) { return false }

        if (user.access_questions == 0) {

            const response = await openai.chat.completions.create({
                model: process.env.model,
                temperature: .1,
                messages: [
                    { role: 'system', content: `Ответь пользователю, что у него не осталось бесплатных запросов, ему нужно подписать на канал https://t.me/bur_live` }
                ]
            })

            const answer = response.choices[0].message.content

            return await ctx.reply(answer, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Проверить подписку', callback_data: 'checkMembership' }]
                    ]
                }
            })

        } else {

            await User.findByIdAndUpdate(user._id, {
                $inc: { access_questions: -1 }
            });

        }

        const cards: {
            majorArcana: string[]
        } = {
            "majorArcana": [
                "Шут",
                "Маг",
                "Жрица",
                "Императрица",
                "Император",
                "Жрец",
                "Влюбленные",
                "Колесница",
                "Сила",
                "Отшельник",
                "Фортуна",
                "Справедливость",
                "Повешенный",
                "Смерть",
                "Умеренность",
                "Дьявол",
                "Башня",
                "Звезда",
                "Луна",
                "Солнце",
                "Суд",
                "Мир"
            ]
        }

        async function getRandomCards(cardsArray: string[], count: number) {
            // Copy the array to avoid modifying the original
            const shuffledArray = [...cardsArray];

            // Fisher-Yates shuffle algorithm
            for (let i = shuffledArray.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
            }

            // Return the first 'count' elements
            return shuffledArray.slice(0, count);
        }

        const list = await getRandomCards(cards.majorArcana, 3)

        // Function to send typing status
        const sendTypingStatus = async () => {
            await ctx.sendChatAction('typing');
        };

        // Send initial typing status
        await sendTypingStatus();

        // Set interval to send typing status every 5 seconds
        const typingInterval = setInterval(sendTypingStatus, 5000);

        // Simulate some processing time
        await new Promise(resolve => setTimeout(resolve, 20000));

        // Clear the interval after 20 seconds (just for demonstration purposes)
        clearInterval(typingInterval);
        await ctx.reply(`Я раскладываю карты таро, чтобы помочь вам получить ответ на ваш вопрос. Ожидайте.`)
        const response = await openai.chat.completions.create({
            model: process.env.model,
            temperature: .1,
            messages: [
                { role: 'system', content: `Представь, что ты знаменитый таролог. Сделай расклад Райдера Уэйта по картам ${list}. Интерпретируй все вопросы и ситуации на основе карт, сделай вывод в утвердительном характере с вероятностью. ${ctx.message.text}.` }
            ]
        })

        await ctx.reply(response.choices[0].message.content)

    } catch (error) {
        console.log(error)
    }
})

home.enter(async (ctx) => { return await greeting(ctx) })
home.action("checkMembership", async (ctx) => {
    try {

        const isMember = await checkChannelMembership

        const user = await User.findOne({ id: ctx.from.id })

        if (!user) { return false }

        if (isMember) {

            await User.findByIdAndUpdate(user._id, {
                $inc: { access_questions: 1 }
            });

            const response = await openai.chat.completions.create({
                model: process.env.model,
                temperature: .1,
                messages: [
                    { role: 'system', content: `Сообщи пользователю, что он успешно подписался на канал, и у него появился бесплатный вопрос на таро, и то что он может задать вопрос на предсказание` }
                ]
            })

            const message = response.choices[0].message.content

            await ctx.editMessageText(message)

        }

    } catch (error) {
        console.log(error)
    }
})
async function checkChannelMembership(ctx: rlhubContext) {
    const userId = ctx.from.id;
    const channelId = '@YourChannelUsername'; // Replace with your channel username

    try {
        const chatMember = await bot.telegram.getChatMember(channelId, userId);

        if (chatMember.status === 'member' || chatMember.status === 'administrator' || chatMember.status === 'creator') {
            return true; // User is a member of the channel
        } else {
            return false; // User is not a member of the channel
        }
    } catch (error) {
        console.error(error);
        throw new Error('Error checking channel membership. Please try again later.');
    }
}

export default home