import mongoose, { Schema, model } from "mongoose";
import type { HydratedDocument, InferSchemaType, Model } from "mongoose";

export const FIELD_TYPES = [
  "text",
  "number",
  "email",
  "textarea",
  "select",
  "checkbox",
  "radio",
] as const;

const FormFieldSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, required: true, enum: FIELD_TYPES },
    label: { type: String, required: true, trim: true },
    placeholder: { type: String, trim: true },
    required: { type: Boolean, default: false },
    options: { type: [String], default: undefined },
  },
  { _id: false },
);

const FormSchema = new Schema(
  {
    /** Owner of the form. Every query is scoped by this so multiple users
     *  and companies can share one deployment safely. */
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: [true, "Form title is required"], trim: true },
    description: { type: String, trim: true },
    fields: { type: [FormFieldSchema], default: [] },
    isActive: { type: Boolean, default: true },
    submissionCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

FormSchema.index({ userId: 1, createdAt: -1 });

export type IFormField = InferSchemaType<typeof FormFieldSchema>;
export type IForm = InferSchemaType<typeof FormSchema>;
export type FormDocument = HydratedDocument<IForm>;

const Form: Model<IForm> =
  (mongoose.models.Form as Model<IForm>) ?? model<IForm>("Form", FormSchema);

export default Form;
