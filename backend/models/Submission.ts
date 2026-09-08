import mongoose, { Schema, model } from "mongoose";
import type { HydratedDocument, InferSchemaType, Model } from "mongoose";

const SubmissionSchema = new Schema(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true, index: true },

    /** Denormalised owner id so a company can query every response it owns
     *  without joining through the forms collection first. */
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    /** Answers keyed by field id. Values are strings or string arrays. */
    responses: { type: Schema.Types.Mixed, required: true },

    submittedAt: { type: Date, default: Date.now },
    ip: { type: String, default: null },
  },
  { timestamps: true },
);

SubmissionSchema.index({ formId: 1, createdAt: -1 });

export type ISubmission = InferSchemaType<typeof SubmissionSchema>;
export type SubmissionDocument = HydratedDocument<ISubmission>;

const Submission: Model<ISubmission> =
  (mongoose.models.Submission as Model<ISubmission>) ??
  model<ISubmission>("Submission", SubmissionSchema);

export default Submission;
