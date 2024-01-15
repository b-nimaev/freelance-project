import mongoose, { Schema, model, ObjectId } from "mongoose";
import { User } from "telegraf/typings/core/types/typegram";

interface IUser extends User {
    _id?: ObjectId;
    chats?: ObjectId[];
    utm?: string,
    access_questions: number;
    createdAt?: any
}

const userSchema: Schema<IUser> = new Schema<IUser>({
    id: { type: Number, required: true },
    username: { type: String },
    first_name: { type: String },
    last_name: { type: String },
    access_questions: { type: Number, default: 1 },
    chats: { type: [mongoose.Schema.Types.ObjectId] },
    utm: { type: String, required: false }
}, {
    timestamps: true
});

const User = model<IUser>('User', userSchema);

export { User, IUser }
