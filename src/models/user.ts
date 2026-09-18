import "server-only";

import { Schema, model, models, type Model, type Types } from "mongoose";
import { ACCOUNT_STATUSES, USER_ROLES, type AccountStatus, type UserRole } from "@/types/domain";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/lib/validation/patterns";

export interface User {
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role: UserRole;
  status: AccountStatus;
  passwordHash?: string;
  emailVerified?: Date;
  googleSubject?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDocument extends User {
  _id: Types.ObjectId;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      match: EMAIL_PATTERN,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      validate: {
        validator(value: string | undefined) {
          return !value || PHONE_PATTERN.test(value);
        },
        message: "phone must be a valid phone number",
      },
    },
    profileImage: { type: String, trim: true, maxlength: 2048 },
    role: { type: String, required: true, enum: USER_ROLES },
    status: {
      type: String,
      required: true,
      enum: ACCOUNT_STATUSES,
      default: "pending",
    },
    passwordHash: { type: String, select: false, minlength: 20, maxlength: 256 },
    emailVerified: { type: Date },
    googleSubject: { type: String, trim: true, maxlength: 255 },
  },
  { timestamps: true, collection: "users" },
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ phone: 1 }, { sparse: true });
userSchema.index(
  { googleSubject: 1 },
  { unique: true, sparse: true, partialFilterExpression: { googleSubject: { $type: "string" } } },
);

export const UserModel: Model<UserDocument> =
  (models.User as Model<UserDocument> | undefined) ??
  model<UserDocument>("User", userSchema);
