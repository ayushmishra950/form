import mongoose, { Schema, model } from "mongoose";
import type { HydratedDocument, InferSchemaType, Model } from "mongoose";

export const FEEDBACK_TYPES = ["feedback", "problem"] as const;
export const FEEDBACK_STATUSES = ["open", "in_review", "resolved"] as const;

const FeedbackSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    /**
     * The author's details are copied in at submission time. Names and emails
     * change, and accounts get deleted — an admin still needs to know who
     * raised a report months later.
     */
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true },

    type: { type: String, required: true, enum: FEEDBACK_TYPES, default: "feedback" },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    status: {
      type: String,
      required: true,
      enum: FEEDBACK_STATUSES,
      default: "open",
      index: true,
    },

    /** Optional reply the admin writes back; the author sees it too. */
    adminNote: { type: String, trim: true, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ userId: 1, createdAt: -1 });

export type IFeedback = InferSchemaType<typeof FeedbackSchema>;
export type FeedbackDocument = HydratedDocument<IFeedback>;

const Feedback: Model<IFeedback> =
  (mongoose.models.Feedback as Model<IFeedback>) ??
  model<IFeedback>("Feedback", FeedbackSchema);

export default Feedback;
