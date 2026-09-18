import "server-only";

import mongoose from "mongoose";

export function isValidObjectId(id: unknown): id is string {
  if (typeof id !== "string" || id.trim() === "") {
    return false;
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return false;
  }

  return new mongoose.Types.ObjectId(id).toString() === id;
}

export function parseObjectId(id: unknown): mongoose.Types.ObjectId {
  if (!isValidObjectId(id)) {
    throw new Error("Invalid database id");
  }

  return new mongoose.Types.ObjectId(id);
}
