// sentenceController.ts
import { Request, Response } from 'express';
import Sentence from '../models/Sentence';
import { AuthRequest } from '../middleware/authenticateToken';
import { ObjectId } from 'mongodb';
import { isValidObjectId } from 'mongoose';
import logger from '../utils/logger';
import isValidObjectIdString from '../utils/isValidObjectIdString';
import User from '../models/User';
import updateRating from '../utils/updateRating';

const sentenceController = {
    getAllSentences: async (req: Request, res: Response) => {
        try {
            const sentence = await Sentence.find();

            if (sentence.length === 0) {
                logger.error(`Предложений не найдено`);
                res.status(404).json({ message: 'Предложения не найдены' });
            } else {
                logger.error(`Предложения получены: ${sentence.length}`);
                res.status(200).json(sentence);
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error retrieving sentence' });
        }
    },


    createSentence: async (req: AuthRequest, res: Response) => {
        try {

            const { text, language } = req.body;
            const author = new ObjectId(req.user.userId); // Assuming you have user information in the request after authentication

            if (!text || !language || !author) {
                logger.error(`Пожалуйста, предоставьте текст, язык и автора`);
                return res.status(400).json({ message: 'Пожалуйста, предоставьте текст, язык и автора' });
            }

            const newSentence = await new Sentence({ text, language, author }).save();

            await User.findByIdAndUpdate({ _id: author }, { $push: { suggestedSentences: newSentence._id } })
            logger.info(`Предложение успешно создано: ${newSentence}`);

            // Вызываем метод обновления рейтинга пользователя
            const updateR = await updateRating(author);
            logger.info(`typeof(updateR) ${ typeof(updateR) }`)
            
            res.status(201).json({ message: 'Предложение успешно создано', sentenceId: newSentence._id });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при создании предложения' });
        }
    },

    updateStatus: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { status, contributorId } = req.body;

            const validStatuses: ('processing' | 'accepted' | 'rejected')[] = ['processing', 'accepted', 'rejected'];

            if (!isValidObjectId(id)) {
                // return res.status(400).json({ message: 'Неверные входные данные' });

                if (!isValidObjectIdString(id)) {

                    return res.status(400).json({ message: `Неверный параметр id, не является ObjectId или невозможно преобразить в ObjectId` })

                }

            }

            if (contributorId && (!isValidObjectId(contributorId))) {

                return res.status(400).json({ message: `Неверный contributorId` })

            } else if (contributorId) {

                const contributorIsExists = await User.findOne({ _id: contributorId })

                if (!contributorIsExists) {

                    return res.status(404).json({ message: `Контрибьютора не существует` })

                }

            }

            if (!validStatuses.includes(status)) {
                return res.status(400).json({ message: 'Неверный статус' });
            }

            const sentence = await Sentence.findById({ _id: new ObjectId(id) });

            if (sentence === null) {
                return res.status(404).json({ message: 'Предложение не найдено', sentence });
            }

            // Добавление нового участника, если статус 'accepted' и передан contributorId
            if (status === 'accepted' && contributorId) {
                sentence.contributors.push(contributorId);
            }

            sentence.status = status;
            await sentence.save();

            res.status(200).json({ message: 'Статус предложения успешно обновлен', sentence });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при обновлении статуса предложения' });
        }
    },

    acceptSentence: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const sentence = await Sentence.findByIdAndUpdate(id, { status: 'accepted' }, { new: true });

            if (!sentence) {
                return res.status(404).json({ message: 'Предложение не найдено' });
            }

            res.json({ message: 'Предложение принято для перевода', sentence });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при принятии предложения для перевода' });
        }
    },

    rejectSentence: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const sentence = await Sentence.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });

            if (!sentence) {
                return res.status(404).json({ message: 'Предложение не найдено' });
            }

            res.json({ message: 'Предложение отклонено', sentence });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Ошибка при отклонении предложения' });
        }
    }
};

export default sentenceController;