import mongoose from "mongoose";

export async function validationError(doc: {
  validate: () => Promise<unknown>;
}): Promise<mongoose.Error.ValidationError | undefined> {
  try {
    await doc.validate();
    return undefined;
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return error;
    }
    throw error;
  }
}
